# Adaptations and data notes

What differs from `source/original_ichef_recetario.html` and the seed JSON, and why.

## Recipe content

**Calabaza: cúrcuma → comino.** The original book lists 1 g of turmeric (cúrcuma) in the calabaza soup. The user avoids it because of ceramic braces, so `data/soups.json` replaces it with 1 g of cumin (comino) and records it in `provenance.adaptations`:

> "Omitted turmeric (1 g) and used cumin (1 g) due to explicit user preference."

The recipe page shows it in Spanish ("Adaptación: se quitó la cúrcuma (1 g) y se usa comino (1 g) por preferencia tuya."). No recipe, step or catalog entry contains turmeric. Curry pastes can contain turmeric, so the `curry_paste` catalog note asks the user to check the label instead of claiming it is turmeric-free.

**Thai legume is one choice, not two.** `options.thaiLegume` offers `none` (default), `chickpeas` or `edamame`, with `gramsFor3IfSelected: 45`. One step adds the selected legume at 45 g per 3 servings, scaled like any ingredient; its controls come from `controlsByLegume` (chickpeas 2–3 min at 90 °C, edamame 5–7 min at 95 °C). With `none` that step is dropped and neither legume appears in steps, totals or nutrition.

**Coconut is fixed** in thai, calabaza and boniato, added in one step each, and is not a soup option.

## Soup ingredients file

`data/foods.json` v2 lists only the 33 ingredients the four meals use. `data/soups.json` (unchanged, schemaVersion 1) still references 28 soup-only ingredients (shiitake, miso, FONDO concentrate and bone broth, coconut milk, chickpeas, edamame, garlic, ginger, …). Those entries were copied verbatim from the v1 catalog into `data/soup-ingredients.json`; `src/seed/foods.ts` merges both files into one catalog and throws on a duplicate id. `foods.json` stays byte-identical to the supplied v2 file.

## Broth

**Type names.** `broth.defaultType` uses `"vegetal"` / `"huesos"` while `broth.types` uses the long form. The seed loader maps `vegetal → vegetable_concentrate` and `huesos → bone_ready`; the app uses only the long form.

**Liquid formula.** The spec's `brothLiquid = roundGrams(baseBrothComponentGramsFor3 × factor)` gives the same grams as the source `amounts()` (`roundedGram((broth + coconutNative) × factor) − roundedGram(coconutNative × factor)`) for all nine recipes at 1–4 servings, and the concentrate ratio matches the source `brothStrength`. Vegetable broth becomes two gram lines (water, frozen concentrate); bone broth becomes ready bone broth plus water, with the water line dropped when bone broth fills all the liquid; there is no diluted-broth unit in ml.

**Per-recipe overrides** follow the source's `state.boneBase[id]` / `state.concentrateBase[id]`. Both are stored per recipe as grams **for 3 servings** and scaled by `servings / 3`. Bone broth is clamped to `[0, brothLiquid]`, so the water line never goes negative; concentrate is clamped to `[0.1, 100]` g for 3, as in the source `broth-adjust` handler.

## Totals

`resolveSoup` derives ingredient totals from the resolved step additions, not from `recipe.ingredients[]`, so preview, steps and the dinner card show the same grams. Per ingredient, the step grams equal `recipe.ingredients[]` for every recipe with one exception: `thai/chickpeas_cooked` (45 g) is listed in `ingredients[]` but only reachable through the selected-legume step.

## B3st label derivation

The user's label for one 60 g bar is 234 kcal, 20 g protein, 21 g carbs, 9.6 g fat, 2.8 g saturated fat, 11 g fiber, 91 mg sodium. `foods.json` stores it once, as per-100 g values (label ÷ 0.6): 390 kcal, 33.3333 g protein, 35 g carbs, 16 g fat, 18.3333 g fiber, 4.6667 g saturated fat, 151.6667 mg sodium, with `estimateQuality: "label_supplied_by_user"`. `calculateNutrition` multiplies by grams/100 like any ingredient, so 60 g gives back the label exactly; there is no separate per-serving entry to double count.

## V1 → V2 slot mapping

Dexie `version(2)` (`src/db/migrations.ts`, `src/db/migrateSlots.ts`) rewrites v1 rows in place and drops the `favorites` and `shoppingPlans` tables; nothing else is deleted. The same mapping runs when a v1 backup is imported (`src/db/exportV1.ts`, `src/db/import.ts`).

| V1 slot | V2 slot |
|---|---|
| `template{templateId}` | kept only if the id exists in v2 (none of the v1 ids do) → `{kind:'empty', note:'v1:template:<id>'}` |
| `combo{proteinId, sideId}` with protein chicken/beef/salmon/shrimp and a `soup_*` side | `{kind:'dinner', proteinId, proteinGrams (220/220/220/250), soupRecipeId, soupServings: 1}` |
| any other `combo` | `{kind:'empty', note:'v1:combo:<proteinId>+<sideId>'}` |
| `soup{soupId}` | `{kind:'empty', note:'v1:soup:<soupId>'}` |
| `free` | `skip` |
| `social` / `skip` / `empty` | unchanged |

Every day gets `flags` (`eaten`/`locked` false). The profile gains `nutrition.dailyCalorieTargetKcal` (seed 2200) when missing, loses `dietary.excludedTags`, and drops excluded ingredient ids that no longer exist in the v2 catalog. An empty slot from this mapping shows "Tu elección anterior ya no existe en el catálogo." in Hoy until the user picks a meal.

## Not ported from the HTML

- Copy-to-clipboard and print buttons.
- The extra sentences the HTML appends for 1 serving on chopping steps ("bajá ingredientes con la espátula…") and for 4 servings on cooking steps ("verificá que lleguen a temperatura…"). The HTML keys them on a step `kind` (`picar` / `cocer`), and `soups.json` steps have no `kind`.

## Day and seed text

**Saturday.** `defaults.json` sets Saturday to `"flexible"`, which is not one of the five day types. Hoy preselects `rest` and shows "Sábado flexible: elegí lo que venga"; any day type can still be chosen.

**English seed strings.** Some seed text is in English (safety notes, provenance, supplement notes, activity effects). The seed files stay unchanged; the UI renders Spanish text from maps in `src/features/sopas/copy.ts`, `src/features/hoy/labels.ts` and `src/features/ajustes/copy.ts`.
