# Data notes

How `data/recetario.json` is read, and what the app changes on the way in. The JSON itself ships unchanged.

## Categories and the "Ligero" filter

The four JSON categories map one to one to the four choices on Elegir (`principales` is shown as "Almuerzo / Cena"). "Ligero" keeps soup + protein meals (`caldo_con_proteina`, roughly 300–440 kcal) and any plate whose reference kcal is ≤ 450. No plate in the current JSON is that light (the lightest is ~625 kcal), so in practice Ligero means the 17 soup meals.

## Devices

Steps use 13 device names. The app groups them into four: `iChef` → iChef; `air_fryer` → Air fryer; `hornalla`, `hornalla_sarten`, `hornalla_o_pava` → Hornalla; `sin cocción`, `bol`, `mesa`, `tabla`, `shaker`, `vaso_*`, `jarra_o_vaso` → Sin cocción. An unknown device name fails seed loading. Recipe cards list "Sin cocción" only when nothing in the recipe is cooked. The JSON also allows `horno_electrico` (in `batchOption` notes) but no step uses it.

## Instructions

149 of 260 top-level steps (and most soup steps) start with "Agregar: Papa pelada 330 g; Romero fresco 3 g; …" before the actual instruction. The segments are exactly the step additions, so `cleanInstructions` drops them and the UI renders the additions (scaled) as the ingredient list. Grams mentioned later in free text (e.g. "pesar 220 g de pulpa asada", "60 g para 3 porciones") are left as written and do not scale.

## Soup meals

- Steps: the JSON's three top-level steps for these meals only point to `embeddedSoup.steps` and `proteinOptions[].steps`; the app renders the soup steps followed by the chosen protein's steps instead.
- Portions: the soup's base is 3 portions; for N plates the soup is scaled to N portions (`roundGrams(grams × N / 3)`) and the protein to N × its grams.
- Broth: a step's `alternativeForBoneBroth.additions` replace the ingredients listed in `replaces` when bone broth is chosen. The alternative's free-text instructions (written for 3 portions) are not shown; a generic bone-broth note is.
- Optional ingredients (only Thai edamame) are excluded unless chosen; a step that only adds an optional ingredient is skipped.
- Random protein: options whose `occasion` is not `habitual` (beef: "limitar frecuencia semanal"; tuna: "ocasional") are never drawn, but can be chosen.

## Nutrition

Per-portion estimates are recomputed from the catalog (`macrosPer100g × grams / 100`) for the resolved ingredients, so they follow the selected protein, broth, optional ingredient and portions. They can differ slightly from the JSON's precomputed `nutrition` values. Items with `macrosPer100g: null` (FONDO concentrate, ready bone broth) are listed as missing, never counted as zero.

## Shop sections

Catalog categories are normalized into nine sections (Verdulería, Frutería, Carnicería, Pescadería, Lácteos y huevos, Almacén, Condimentos, Congelados, Suplementos). 31 ingredients whose category is just "Ingrediente" are assigned by id in `normalize.ts` (e.g. corvina → Pescadería, shiitake → Verdulería, curry paste → Almacén). Water and ice are never listed.

## Migration from earlier versions

Dexie v3 keeps each soup's broth choice (old id `miso` → `soup_miso`; Thai legume `edamame` → optional edamame on) and the text-size setting; v4 drops the planner tables (profile, days). Daily plans, favorites and the old shopping plan are discarded. Backups from earlier versions are rejected on import.
