#!/usr/bin/env python3
"""Validate iChef variant files against data/recetario.json.

Usage: python3 -I scripts/validate-ichef-variants.py <variants.json> [--ids id1,id2,...]

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
SPEEDS = {0.5, 1, 2, 3, 4, 5}
MAX_STEP_SECONDS = 40 * 60


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


def check_step(where, step, catalog, errors):
    for key in ("title", "device", "instructions", "additions"):
        if key not in step:
            errors.append(f"{where}: missing {key}")
    device = step.get("device")
    if device not in DEVICES:
        errors.append(f"{where}: device {device!r} not in {sorted(DEVICES)}")
    for a in step.get("additions", []):
        if a.get("ingredientId") not in catalog:
            errors.append(f"{where}: unknown ingredient {a.get('ingredientId')!r}")
        if not isinstance(a.get("grams"), (int, float)) or a["grams"] <= 0:
            errors.append(f"{where}: bad grams for {a.get('ingredientId')!r}")
    text = step.get("instructions", "")
    if text.startswith("Agregar:"):
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
            if t is not None and (len(t) != 2 or t[0] > t[1] or t[1] > 100 or t[0] < 37):
                errors.append(f"{where}: temperatureCRange must be null or within 37–100 °C, got {t}")
            s = m.get("speed", {})
            mode = s.get("mode")
            if mode == "numeric":
                if s.get("value") not in SPEEDS:
                    errors.append(f"{where}: numeric speed must be one of {sorted(SPEEDS)}, got {s.get('value')}")
                if t is not None and s.get("value", 0) > 2:
                    errors.append(f"{where}: with heat, speed must be ≤ 2 (use gradual blending after cooling)")
            elif mode in ("gradual", "manual"):
                if s.get("value") is not None:
                    errors.append(f"{where}: {mode} speed needs value null")
            else:
                errors.append(f"{where}: speed.mode must be numeric|gradual|manual")
            if not isinstance(m.get("reverseIfSupported"), bool):
                errors.append(f"{where}: reverseIfSupported must be boolean")
        if not step.get("sourceSettingsText"):
            errors.append(f"{where}: iChef step needs sourceSettingsText")
        if (m or {}).get("temperatureCRange") and not step.get("safety"):
            errors.append(f"{where}: hot iChef step needs a safety note")
    elif device == "air_fryer":
        if not isinstance(step.get("minutes"), (int, float)) or not isinstance(step.get("temperatureC"), (int, float)):
            errors.append(f"{where}: air_fryer step needs minutes and temperatureC")
    elif device == "hornalla":
        if not isinstance(step.get("minutes"), (int, float)) or not step.get("heat"):
            errors.append(f"{where}: hornalla step needs minutes and heat")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
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
