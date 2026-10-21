# Nutrition Companion — minimal V2 specification (overrides previous MVP specification)

You are modifying an existing personal Spanish-language iPhone-first offline PWA, or implementing it if the repository does not yet contain application code. **This V2 document supersedes older `CLAUDE.md`/`PROMPT.md` instructions wherever they differ.** Deliver a tested running app, not a plan or mockup. Use `data/foods.json`, `data/soups.json` and `data/defaults.json` from this folder as authoritative SEED DATA. Do not use seed data as immutable replacement for the user's own daily choices.

## Product philosophy

**Minimum friction: open the app, decide today's real activity, know what to eat, swap something easily, and follow a soup recipe.** The app is not a nutrition tracker, workout tracker, wellness dashboard, shopping assistant or AI coach. No features that create administrative work. UI copy is `es-UY` and time zone `America/Montevideo`.

## Scope — two main tabs + a settings entry

### A. `Hoy` — sole meal-planning UI

- On first opening each local calendar day, show a compact activity selection prefilled from configured weekly schedule: musculación, boxeo, descanso, sin tiempo, enfermo. Allow confirmation and later change without resetting the meals already chosen.
- Display four editable meal suggestions: **desayuno, almuerzo, merienda, cena**. Show time and **each ingredient with its grams**, plus raw/dry/cooked indicators where important. Actual recipes and portions come from the data JSON. Preserve one-tap swap and quick choice; do not demand food logs or completion ticks.
- Keep macros hidden until the user expands **`Ver nutrición estimada`**. When shown, clearly label estimated, partly known or unknown values. User may edit the daily kcal target (initial seed 2200, tentative broad range 2100–2300 kcal) and see daily kcal/protein status with uncertainty, only on demand. Do not claim 2200 kcal is an exact medical prescription.
- The primary daily default: whey + unsweetened oat milk for breakfast; substantial lunch with chicken/beef/shrimp/salmon, measured starch and vegetables; compact B3st bar/yogurt or fruit snack; lighter dinner with chicken/beef/salmon/shrimp **plus one of the nine iChef soups**. No extra dinner rice/potato by default. The user likes a **large lunch and a small breakfast/dinner**. Other presets and swaps should be easy to access without a large catalog UI.
- Only four selectable **main meal proteins**: chicken, lean beef, salmon and shrimp. Eggs/whey/yogurt are allowed in breakfast/snack templates; soup-specific ingredients (like tofu) remain as defined in soups. Lunch sides: brown rice, potato, sweet potato, whole-wheat pasta, quinoa with familiar vegetables. Healthy fats chiefly **measured olive oil**; sesame oil when used in a soup. No compulsory avocado. User prefers yogurt portions **125–150 g**, not 250 g by default.
- `foods.json` contains only 3 breakfast templates, 3 snack templates, 3 lunch presets, 4 dinner presets, four main-protein choices, five lunch starch/vegetable sides and nine soup refs. Do not auto-create dozens of variants.
- For lunch and dinner, let user keep/lock protein or side independently and roll/choose another valid component; editing the meal should be quick and reversible. The app may show recommended presets first. Lunch ingredients are RAW for meat and vegetables and DRY for starches; dinner meat weights RAW.
- A flexible social dinner (`friends` / `family`) is a separate override of dinner, **independent of activity type**, with no made-up calories or 'make-up' fasting. No compulsory calendar or visible weekly dashboard. When sick, prioritize tolerable meals/hydration and no forced calorie deficit.

### B. `Sopas` — only cooking-mode feature

- This tab replaces any old tab **`Cocinar`**. It contains ALL NINE supplied recipes in `data/soups.json`, searchable, 1–4 portions, vegetable FONDO concentrate OR ready-made frozen bone broth, coconut only in the recipes that specify it, optional Thai legumes exactly as data specifies.
- Every kitchen-mode step MUST list **the grams of each ingredient ADDED IN THAT STEP**, and time, speed, temperature, and safety note/appropriate lid instructions. Do not rely only on a master ingredients list. Ingredient lists scale precisely; hot blending must be cautious. Follow the data schema's reference gram scaling and FONDO rules. Do not invent unverified speed modes or claim the iChef instructions are official.
- `soups.json` is the SAME nine-soup dataset from the original project. Preserve all recipe features and user soup choices, without adding a global shopping workflow. Turmeric was deliberately removed from the pumpkin soup; do not reintroduce it. Coconut fixed only in Thai, Calabaza and Boniato.

### C. Settings (small icon in Hoy; NOT a top-level tab)

- Expected weekly activities, typical meal times, editable approximate calorie/protein targets, lightweight local data backup/import/export. No complex setup wizard. Keep previously saved user overrides when updating bundled seeds.

## Remove features entirely

- Remove **favorites** completely: no heart buttons, favorites collections, favorite store, favorite badges, favorite filtering or presets called "favorites". The previous salmon+leek soup pairing is a normal preset, not a favorite system.
- Remove **shopping** entirely: no Comprar tab, shopping list, grocery aggregation, planning grocery runs, or related screens/stubs/storage.
- Remove separate `¿Qué como?` navigation tab: the chooser/swapper lives inline under today's meal selection. Do not add visible weekly calendar or dashboard.
- Remove notifications, training reminders, progress tracking, scales, weigh-in/mood/sleep logs, Hevy features, pantry, AI API, backend, login and any commercial/social features.
- Remove stale routes, imports, tests and obsolete state from the older MVP; update README and navigation so no dead UI remains. Keep the PWA offline-first, private and usable.

## CRITICAL: meal swap and calorie rebalancing

The user asks that changing ANY meal in the daily plan **recalculates the projected total and tries to maintain the planned daily calorie target**.

Implement the following behavior with pure, tested functions and a small intuitive UI:

1. Resolve all four meals to ingredient weights and calculate nutrition from per-100g catalog only when weights/bases and data are valid. For soup, use the same soup resolver as `Sopas` (selected servings, broth/coconut settings); use ONE SERVING for a dinner accompaniment. Do not double-count soup liquid, oil or ingredients.
2. After a swap, update the chosen meal and the **projected total IMMEDIATELY**. Show the difference vs the current daily kcal target with an uncertainty warning when any ingredient has unavailable macros (e.g., FONDO products). Zero is not a substitute for unknown nutrition. `nutritionLabelPerServing` of B3st must take precedence: **one 60g bar: 234 kcal, 20g protein, 21g carbs, 9.6g fat, 11g fiber**. Other products are generic estimates until the user enters their labels.
3. If the change puts the *reliably estimable* daily total outside a configurable tolerance (default ±75 kcal), **offer** the user a compact, one-tap adjustment (e.g. adjust a measured lunch starch, add/adjust fruit, or use a higher-energy breakfast/snack option) that makes the estimate closer to target. **Do not silently modify other meals**; show proposed food and old/new grams, projected kcal difference and explanation before applying. A user can decline and keep the new meal as is.
4. Prefer adjusting **UNCONFIRMED meals still ahead in the day**, especially lunch starch, rather than removing protein. Respect simple realistic min/max portion bounds for each food. The food swap itself is always committed; only proposed other changes await approval. Never retroactively change meals marked eaten/locked, even if the app does not demand logging. Do not change protein portions below daily goal or rely on giant starch portions to hit a number. If the remaining gap cannot be reconciled reasonably, communicate that and leave it unresolved.
5. Day activities influence convenience and meal timing; a missed workout is **not** an excuse for an arbitrary calorie cut. For social dinners of unknown caloric value or incomplete soup macro data, show the known subtotal and unavailable amount instead of proposing a mathematically fake 'perfect' total. No compensation for social dinners.
6. Adapt meal planning to practical context. A whey-only breakfast or soup+meat dinner can make totals lower than 2200: warn, suggest a reasonable increase at lunch or an additional energy-containing snack, but never force an aggressive minimum or assert that an incomplete estimate meets targets.

## Engineering constraints

- Prefer Vite + React + strict TypeScript + Tailwind, IndexedDB/Dexie with migrations, `vite-plugin-pwa`, Vitest, local in-bundle seed JSON. Work with whatever existing stack is present rather than unnecessarily rewriting it.
- No backend, accounts, cloud data, AI APIs, analytics or network dependency after PWA assets cache. Spanish UI, mobile-first touch layout, iOS safe area, accessible focus targets.
- Maintain **schema migration** from previous `foods.json` schemaVersion 1 to schemaVersion 2, and `defaults.json` version 2. Preserve actual existing daily preferences and recipe options where possible, including on PWA update. Do not wipe IndexedDB on schema changes. Old obsolete favorites and shopping data may be discarded only after other user state is retained.
- Source `soups.json` still schemaVersion 1: that is intentional, independent of foods v2.
- Keep meal templates as user-editable selections; avoid replacing user choices on each page load.
- Use types and validate seed references; show useful errors and recovery, not silent crashes.

## Tests (must pass)

- Seed sanity: exactly 4 selectable main proteins, 3 breakfasts, 3 snacks, 3 lunch presets, 4 dinner presets, 9 soup refs and 9 complete soup recipes; all ingredient and recipe refs resolve.
- Specific B3st label: `60g => 234kcal, P20g, C21g, F9.6g, fiber11g` and calorie display does NOT double-use per-serving and per-100g entries.
- Substituting any meal recomputes projected calories and protein immediately; when feasible it offers a reversible, bounded adjustment in a different unconfirmed meal; pressing decline leaves other meals untouched; accepting applies exactly the displayed weights.
- No automatic edit of an already-eaten/locked meal; no auto compensation for social dinner; no bogus exact totals with unknown soup nutrition.
- Salmon 220g raw + one serving leek/peas soup resolves correctly as an ordinary dinner preset.
- Soup gram scaling for 1–4 servings, separated water/FONDO-concentrate weights, correct bone broth vs water, coconut only in 3 recipes, optional Thai legume selection, and per-step gram additions.
- Correct persistence and migrations across reload, offline operation after first visit, exported/imported settings and daily data.
- No Favorites, Comprar, Cocinar or a separate ¿Qué como? tab; no dead stubs.
- Typecheck/lint/test/build all run and pass; fix failures, don't only state planned tests.

**Completion:** implement end-to-end, verify functionality, report commands and any remaining device-specific/manual constraints. Do not stop at a roadmap or ask questions unless blocked by missing source code.
