#!/usr/bin/env python3
"""Validate iChef variant files (and step-fix files) against data/recetario.json.

Usage: python3 -I scripts/validate-ichef-variants.py <variants.json> [--ids id1,id2,...]
       python3 -I scripts/validate-ichef-variants.py --fixes <step-fixes.json>

iChef settings follow docs/ICHEF_REFERENCE.md (patterns from the official recipe portal).

A variant re-plans a recipe's steps to use the iChef (often in parallel with the air fryer or
hornalla). It must add exactly the same ingredients and grams as the original recipe; only water
and ice may differ (they are never bought and have no macros). --ids checks that every listed
recipe is either in "variants" or in "skipped".
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FREE = {"water", "ice"}
DEVICES = {"iChef", "air_fryer", "hornalla", "sin cocción"}
# Original recetario.json device names (normalized by the app); allowed when a fix keeps the original device.
RAW_DEVICES = DEVICES | {"hornalla_sarten", "hornalla_o_pava", "bol", "mesa", "tabla", "shaker",
                         "vaso_jugadora_o_licuadora", "vaso_o_jarra", "jarra_o_vaso"}
SPEEDS = {0.3} | {x / 2 for x in range(1, 21)}  # 0.3 and 0.5–10 in 0.5 steps, as on the portal
MAX_HOT_SPEED = 3.5
MAX_STEP_SECONDS = 70 * 60
FIX_KEYS = {"title", "device", "instructions", "minutes", "temperatureC", "heat", "verify", "parallelGroup",
            "machineSettingsSuggested", "sourceSettingsText", "safety"}


def load_recipes():
    data = json.loads((ROOT / "data" / "recetario.json").read_text())
    recipes = {r["id"]: r for cat in data["categories"].values() for r in cat}
    catalog = {i["id"] for i in data["ingredientCatalog"]}
    return recipes, catalog


def totals(steps):
    out = defaultdict(float)
    for step in steps:
        for a in step.get("additions", []):
            out[a["ingredientId"]] += a["grams"]
    return out


def check_step(where, step, catalog, errors, devices=DEVICES, check_text=True):
    for key in ("title", "device", "instructions", "additions"):
        if key not in step:
            errors.append(f"{where}: missing {key}")
    device = step.get("device")
    if device not in devices:
        errors.append(f"{where}: device {device!r} not in {sorted(devices)}")
    for a in step.get("additions", []):
        if a.get("ingredientId") not in catalog:
            errors.append(f"{where}: unknown ingredient {a.get('ingredientId')!r}")
        if not isinstance(a.get("grams"), (int, float)) or a["grams"] <= 0:
            errors.append(f"{where}: bad grams for {a.get('ingredientId')!r}")
        if a.get("fixed") and a.get("ingredientId") != "water":
            errors.append(f"{where}: only water can be fixed (not scaled by portions)")
        if a.get("place") not in (None, "canasta", "vaporera"):
            errors.append(f"{where}: place must be 'canasta' or 'vaporera'")
    text = step.get("instructions", "")
    if check_text and text.startswith("Agregar:"):
        errors.append(f"{where}: instructions must not repeat the additions ('Agregar: ...')")
    if device == "iChef":
        m = step.get("machineSettingsSuggested")
        if not m:
            errors.append(f"{where}: iChef step needs machineSettingsSuggested")
        else:
            d = m.get("durationSecondsRange")
            if d is not None and (len(d) != 2 or d[0] > d[1] or d[1] > MAX_STEP_SECONDS or d[0] <= 0):
                errors.append(f"{where}: bad durationSecondsRange {d}")
            t = m.get("temperatureCRange")
            steam = m.get("steam") is True
            if t is not None and (len(t) != 2 or t[0] > t[1] or t[1] > 160 or t[0] < 37):
                errors.append(f"{where}: temperatureCRange must be null or within 37–160 °C, got {t}")
            if steam and t is not None:
                errors.append(f"{where}: steam mode ('Cocinar al vapor') takes temperatureCRange null")
            acc = m.get("accessories")
            if acc is not None and (not isinstance(acc, list) or not all(isinstance(a, str) and a for a in acc)):
                errors.append(f"{where}: accessories must be a list of strings")
            s = m.get("speed", {})
            mode = s.get("mode")
            hot = t is not None or steam
            if mode == "numeric":
                if s.get("value") not in SPEEDS:
                    errors.append(f"{where}: numeric speed must be 0.3 or 0.5–10 in 0.5 steps, got {s.get('value')}")
                elif hot and s.get("value") > MAX_HOT_SPEED:
                    errors.append(f"{where}: with heat or steam, speed must be ≤ {MAX_HOT_SPEED}; blend only after it cools below 90 °C")
            elif mode == "gradual" and hot:
                errors.append(f"{where}: gradual blending is only for cooled (< 90 °C, no heat) mixtures")
            elif mode in ("gradual", "manual"):
                if s.get("value") is not None:
                    errors.append(f"{where}: {mode} speed needs value null")
            else:
                errors.append(f"{where}: speed.mode must be numeric|gradual|manual")
            if not isinstance(m.get("reverseIfSupported"), bool):
                errors.append(f"{where}: reverseIfSupported must be boolean")
        if not step.get("sourceSettingsText"):
            errors.append(f"{where}: iChef step needs sourceSettingsText")
        if ((m or {}).get("temperatureCRange") or (m or {}).get("steam")) and not step.get("safety"):
            errors.append(f"{where}: hot or steam iChef step needs a safety note")
    elif device == "air_fryer":
        if not isinstance(step.get("minutes"), (int, float)) or not isinstance(step.get("temperatureC"), (int, float)):
            errors.append(f"{where}: air_fryer step needs minutes and temperatureC")
    elif device == "hornalla":
        if not isinstance(step.get("minutes"), (int, float)) or not step.get("heat"):
            errors.append(f"{where}: hornalla step needs minutes and heat")


def check_fixes(path, recipes, catalog):
    doc = json.loads(Path(path).read_text())
    errors = []
    for i, fix in enumerate(doc.get("fixes", [])):
        where = f"fixes[{i}] {fix.get('recipeId')} {fix.get('part')} #{fix.get('step')}"
        recipe = recipes.get(fix.get("recipeId"))
        if not recipe:
            errors.append(f"{where}: unknown recipe")
            continue
        part = fix.get("part", "")
        if part == "main":
            steps = None if "embeddedSoup" in recipe else recipe["steps"]
        elif part == "soup":
            steps = recipe.get("embeddedSoup", {}).get("steps")
        elif part.startswith("protein:"):
            steps = next((p["steps"] for p in recipe.get("proteinOptions", []) if p["id"] == part[8:]), None)
        else:
            steps = None
        n = fix.get("step")
        if not steps or not isinstance(n, int) or not 1 <= n <= len(steps):
            errors.append(f"{where}: part/step does not exist")
            continue
        if not fix.get("reason"):
            errors.append(f"{where}: needs a reason")
        bad = set(fix.get("set", {})) - FIX_KEYS
        if bad:
            errors.append(f"{where}: cannot change {sorted(bad)} (grams and additions are fixed)")
        merged = {**steps[n - 1], **fix.get("set", {})}
        check_step(where, merged, catalog, errors, devices=RAW_DEVICES, check_text="instructions" in fix.get("set", {}))
    if errors:
        print("\n".join(errors))
        print(f"FAIL: {len(errors)} problem(s)")
        sys.exit(1)
    print(f"OK: {len(doc.get('fixes', []))} step fixes")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    if sys.argv[1] == "--fixes":
        recipes, catalog = load_recipes()
        check_fixes(sys.argv[2], recipes, catalog)
        return
    path = Path(sys.argv[1])
    ids = []
    if "--ids" in sys.argv:
        ids = sys.argv[sys.argv.index("--ids") + 1].split(",")
    recipes, catalog = load_recipes()
    doc = json.loads(path.read_text())
    errors = []
    seen = set()
    for i, v in enumerate(doc.get("variants", [])):
        rid = v.get("recipeId")
        where = f"variants[{i}] {rid}"
        if rid not in recipes:
            errors.append(f"{where}: unknown recipe")
            continue
        recipe = recipes[rid]
        if recipe.get("subtype") == "caldo_con_proteina":
            errors.append(f"{where}: soup + protein meals already use the iChef; skip them")
        if rid in seen:
            errors.append(f"{where}: duplicate recipe")
        seen.add(rid)
        for key in ("title", "summary", "minutes", "steps"):
            if key not in v:
                errors.append(f"{where}: missing {key}")
        steps = v.get("steps", [])
        if not any(s.get("device") == "iChef" for s in steps):
            errors.append(f"{where}: a variant must use the iChef")
        for j, step in enumerate(steps):
            check_step(f"{where} step {j + 1}", step, catalog, errors)
        want = {k: round(g, 1) for k, g in totals(recipe["steps"]).items() if k not in FREE}
        got = {k: round(g, 1) for k, g in totals(steps).items() if k not in FREE}
        for k in sorted(set(want) | set(got)):
            if want.get(k) != got.get(k):
                errors.append(f"{where}: {k} grams {got.get(k)} != original {want.get(k)}")
        groups = defaultdict(set)
        for s in steps:
            if s.get("parallelGroup"):
                groups[s["parallelGroup"]].add(s.get("device"))
        for g, devs in groups.items():
            if len(devs) < 2:
                errors.append(f"{where}: parallelGroup {g!r} should span at least two devices")
    for i, s in enumerate(doc.get("skipped", [])):
        if s.get("recipeId") not in recipes:
            errors.append(f"skipped[{i}]: unknown recipe {s.get('recipeId')!r}")
        if not s.get("reason"):
            errors.append(f"skipped[{i}]: needs a reason")
        if s.get("recipeId") in seen:
            errors.append(f"skipped[{i}]: {s.get('recipeId')} is also a variant")
        seen.add(s.get("recipeId"))
    missing = [rid for rid in ids if rid not in seen]
    if missing:
        errors.append(f"not covered (add a variant or a skipped entry): {', '.join(missing)}")
    if errors:
        print("\n".join(errors))
        print(f"FAIL: {len(errors)} problem(s)")
        sys.exit(1)
    print(f"OK: {len(doc.get('variants', []))} variants, {len(doc.get('skipped', []))} skipped")


if __name__ == "__main__":
    main()
