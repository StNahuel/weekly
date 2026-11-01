# weekly — recipe book PWA (V3 specification; supersedes the V1 planner and V2 "Hoy + Sopas" specs)

A private, Spanish-language (`es-UY`), iPhone-first, offline PWA for one person in Uruguay. It is a **decision-reduction recipe book**, not a planner, calorie tracker or coach: pick what kind of preparation you want, get a random recipe, swipe until one fits, cook it step by step, and build a shopping list from the meals you plan to cook.

## Source data

- `data/recetario.json` is the single authoritative recipe source (schema `4.x`, four visible categories). It replaces the old `foods.json`, `soups.json`, `defaults.json` and `soup-ingredients.json`. Ship it unchanged; adapt in `src/domain/recipes/normalize.ts`, never by editing the JSON by hand.
- `source/original_ichef_recetario.html` is kept only as a reference for the original soup book.
- Do not invent recipes, ingredients or grams. Turmeric stays out of every recipe; curry paste may contain it (check the label).

## Product scope

1. **Elegir** (landing): choose Desayuno, Almuerzo / Cena, Merienda or Jugo. Almuerzo / Cena has a **Ligero** toggle (soup + protein meals and any plate ≤ 450 kcal). Show one random recipe card; **swipe left = otra receta, swipe right = ver la preparación**, with equivalent buttons. Avoid repeating recently seen recipes. For soup meals, the protein is drawn among the usual options (beef and tuna are occasional and not drawn).
2. **Recetas**: full list with search (title, soup, ingredients; accent-insensitive) and category filter.
3. **Recipe detail**: ingredients with grams for 1–4 portions, then "Cocinar paso a paso". Soup meals (`caldo_con_proteina`) let you pick the protein, the broth (FONDO vegetal concentrate **or** ready bone broth, never both) and the optional ingredient (Thai edamame). Nutrition per portion stays collapsed under "Ver nutrición estimada"; unknown macros (FONDO, broth) are listed, never counted as zero.
4. **Kitchen mode**: one step per screen. Every step shows the device (iChef, Air fryer, Hornalla, Sin cocción), each ingredient added in that step with grams, the instruction, and the device settings (iChef time/temperature/speed/reverse + original text; air fryer minutes and °C; hornalla minutes and heat), plus verify (internal temperature) and safety notes. Soup meals run the soup steps first, then the protein. iChef settings are home-authored and unverified: label them indicative.
5. **Compras**: add 1–N meals from the catalog (with portions and protein), get a consolidated list in grams grouped by shop section, with persistent checkboxes. Soup portions of the same soup are cooked in batches of at most 4 (5 → 3 + 2). Water and ice are never listed.
6. **Ajustes** (icon on Elegir): larger text, JSON backup export/import (schema-versioned, Zod-validated, explicit confirmation before replacing).

Out of scope: daily planning, day types, schedules, meal times, calorie targets or rebalancing, social dinners, favorites, notifications, tracking of any kind, accounts, backend, AI, analytics.

## Engineering

- Vite + React + strict TypeScript + Tailwind 4, Dexie (IndexedDB) with versioned migrations, `vite-plugin-pwa`, Zod. All data ships in the bundle; no network after the first load.
- One resolver (`resolveRecipe` / `soupSteps` in `src/domain/recipes/resolve.ts`) feeds the detail, kitchen mode, nutrition and shopping list, so grams never disagree. Scaling uses `roundGrams` (≥10 g → 1 g, ≥1 g → 0.5 g, else 0.1 g).
- Dexie: v3 migrates soup broth preferences to the embedded soup ids and the text-size setting to `meta`; v4 drops the planner tables. Never edit a shipped version.
- UI copy in Spanish; code and developer docs in English. Mobile-first (375–430 px), 44 px touch targets, safe-area padding, accessible names.

## Process

No automated test suite, by choice: this is a one-user app and tests slow iteration down. Do not add Vitest, Testing Library or test files. The gate is `pnpm typecheck && pnpm lint && pnpm build` (what `.github/workflows/pages.yml` runs), plus `node scripts/check-bundle.mjs` for the first-route budget; check behaviour by hand in the browser at ~390 px.
