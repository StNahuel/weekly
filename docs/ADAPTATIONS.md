# Adaptations and data notes

What differs from `source/original_ichef_recetario.html` and the seed JSON, and why. Each claim names the test that pins it.

## Recipe content

**Calabaza: cúrcuma → comino.** The original book lists 1 g of turmeric (cúrcuma) in the calabaza soup. The user avoids it because of ceramic braces, so `data/soups.json` replaces it with 1 g of cumin (comino) and records it in `provenance.adaptations`:

> "Omitted turmeric (1 g) and used cumin (1 g) due to explicit user preference."

The recipe page shows it in Spanish ("Adaptación: se quitó la cúrcuma (1 g) y se usa comino (1 g) por preferencia tuya."). No recipe, step or catalog entry contains turmeric (`src/domain/soups/calabaza.test.ts`, `src/features/cocinar/RecipeDetail.test.tsx`). Curry pastes can contain turmeric, so the `curry_paste` catalog note asks the user to check the label instead of claiming it is turmeric-free (`calabaza.test.ts`).

**Thai legume is one choice, not two.** `options.thaiLegume` offers `none` (default), `chickpeas` or `edamame`, with `gramsFor3IfSelected: 45`. One step adds the selected legume at 45 g per 3 servings, scaled like any ingredient; its controls come from `controlsByLegume` (chickpeas 2–3 min at 90 °C, edamame 5–7 min at 95 °C). With `none` that step is dropped and neither legume appears in steps, totals, shopping or nutrition (`src/domain/soups/thaiLegume.test.ts`, `src/features/cocinar/KitchenMode.test.tsx`).

**Coconut is fixed** in thai, calabaza and boniato, added in one step each, and is not a soup option (`src/domain/soups/coconut.test.ts`).

## Broth

**Type names.** `broth.defaultType` uses `"vegetal"` / `"huesos"` while `broth.types` uses the long form. The seed loader maps `vegetal → vegetable_concentrate` and `huesos → bone_ready`; the app uses only the long form (`src/seed/seed.test.ts`).

**Liquid formula.** The spec's `brothLiquid = roundGrams(baseBrothComponentGramsFor3 × factor)` gives the same grams as the source `amounts()` (`roundedGram((broth + coconutNative) × factor) − roundedGram(coconutNative × factor)`) for all nine recipes at 1–4 servings, and the concentrate ratio matches the source `brothStrength` (`src/domain/soups/parity.test.ts`). Vegetable broth becomes two gram lines (water, frozen concentrate); bone broth becomes ready bone broth plus water, with the water line dropped when bone broth fills all the liquid; there is no diluted-broth unit in ml (`src/domain/soups/broth.test.ts`).

**Per-recipe overrides** follow the source's `state.boneBase[id]` / `state.concentrateBase[id]`. Both are stored per recipe as grams **for 3 servings** and scaled by `servings / 3`. Bone broth is clamped to `[0, brothLiquid]`, so the water line never goes negative; concentrate is clamped to `[0.1, 100]` g for 3, as in the source `broth-adjust` handler (`src/domain/soups/resolveSoup.test.ts`, `src/features/cocinar/SoupOptions.test.tsx`).

## Totals

`resolveSoup` derives ingredient totals from the resolved step additions, not from `recipe.ingredients[]`, so preview, steps and shopping show the same grams (`src/domain/soups/resolveSoup.test.ts`, `src/test/misoTwoServings.test.tsx`). Per ingredient, the step grams equal `recipe.ingredients[]` for every recipe with one exception: `thai/chickpeas_cooked` (45 g) is listed in `ingredients[]` but only reachable through the selected-legume step (`src/seed/integrity.test.ts`, `src/domain/soups/scales.test.ts`).

## Not ported from the HTML

- Copy-to-clipboard and print buttons.
- The extra sentences the HTML appends for 1 serving on chopping steps ("bajá ingredientes con la espátula…") and for 4 servings on cooking steps ("verificá que lleguen a temperatura…"). The HTML keys them on a step `kind` (`picar` / `cocer`), and `soups.json` steps have no `kind`.

## Day and seed text

**Saturday.** `defaults.json` sets Saturday to `"flexible"`, which is not one of the five day types. Hoy preselects `rest` and shows "Sábado flexible: elegí lo que venga"; any day type can still be chosen (`src/domain/day/today.test.ts`, `src/features/hoy/DayTypePrompt.test.tsx`).

**English seed strings.** Some seed text is in English (safety notes, provenance, supplement notes, activity effects). The seed files stay unchanged; the UI renders Spanish text from maps in `src/features/cocinar/copy.ts`, `src/features/hoy/labels.ts` and `src/features/ajustes/copy.ts`.
