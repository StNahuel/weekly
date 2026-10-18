# Personal Nutrition Companion — implementation specification

You are implementing a **real, runnable, Spanish-language, iPhone-first, offline-first PWA** for ONE user in Uruguay. Deliver the working product; do not stop at a mockup, proposal, or partial scaffolding.

This is a private planning/cooking **decision-reduction tool**, not a calorie-tracking app, medical platform, workout tracker, or coaching service. The north star is: **help the user decide what to eat in under one minute**, and guide them through cooking iChef soups with reliable ingredient weights per step. Avoid complexity and engagement gimmicks.

## Authoritative local inputs

- `data/foods.json`: curated reusable ingredient catalog, protein mains, accompaniments, breakfast and snack templates, favorite combinations.
- `data/soups.json`: nine soup recipes migrated from `source/original_ichef_recetario.html`. This JSON is the primary normalized source, and the HTML is preserved for checking parity.
- `data/defaults.json`: editable seed profile, dietary rules, expected weekly activity template, and explicit exclusions.
- `README.md`: usage/deployment context.

**Do not replace supplied recipes with generic AI-generated ones** or alter their core ingredients. One explicit adaptation is deliberate: the calabaza soup omits turmeric (user avoids it because of ceramic braces) and uses cumin. Document all other unavoidable changes. Consider curry pastes may contain turmeric: show a check-the-label note instead of pretending a paste is always turmeric-free.

## Stack and delivery

- Vite + React + TypeScript (strict) + Tailwind CSS. Use clean, touch-friendly styling, accessible UI, and simple Lucide icons; add shadcn/ui only if it materially accelerates the work.
- PWA via `vite-plugin-pwa` with correctly configured manifest and service worker for **offline use after the first visit**. iPhone Safari "Add to Home Screen" flow documented.
- IndexedDB via Dexie (or a similarly simple library), with **schema versioning and migrations**, for user preferences, edits to suggested meals, daily decisions, favorites, shopping plans/checks, and import/export.
- All seed JSON ships **in the bundle**. No Firebase, Supabase, SaaS services, AI API, external nutrition API, subscriptions, account/login, or telemetry. No server required for app functionality (static HTTPS hosting is allowed to install PWA on iPhone).
- Vitest + Testing Library for computation/business logic and key UI flows. Typecheck, lint, tests, and production build must run successfully.
- Mobile-first responsive view: priority is 375–430 px width and comfortable touch targets. Test desktop too, but do not invent a complex desktop dashboard.
- Spanish UI, Uruguayan phrasing and metric units; `es-UY`, timezone `America/Montevideo`, 24-hour clock.
- Set clear accessible names/labels and keyboard focus, safe-area padding on iPhone, skeleton/empty/error states and data-loading feedback. Dark understated design inspired by the source soup recipe HTML is welcome.

## Product scope — exactly five user-facing areas

### 1) HOY (the landing page)

On first opening **each local calendar day**, propose today's day type from the weekly template. Ask: "¿Qué tipo de día vas a tener?" with five choices:

- `strength` — Musculación
- `boxing` — Boxeo
- `rest` — Descanso
- `busy` — Sin tiempo / trabajo
- `sick` — Enfermo / recuperación

Preselect the suggested day; allow one-tap confirmation and change it any time later. Store the date, chosen day type and daily meal selection in IndexedDB. Do not nag, backfill days, or invent a streak metric.

After confirmation show **four meal slots** — desayuno, almuerzo, merienda, cena — with user-configured target times and *ready-to-use* suggestions and **gram quantities**. Each slot can be replaced, viewed, reshuffled and/or manually adjusted. Lunch/dinner are assembled from protein + side; breakfast/snack come from corresponding template catalog. The interface is practical and visually uncluttered.

The schedule is a *suggestion*, never a prison. Strength usually Mon/Wed/Fri in the morning, boxing Tues/Thurs evenings, Sunday restful gaming day, Saturday flexible. Work typically starts between 09:00–10:00 and ends 18:00–19:00, mostly seated. Default schedule can conflict with boxing at 18:00: **ask to configure actual class/work hours or show a conflict warning**, never pretend this is automatically possible. No fixed training reminders.

**Social dinner is independent from day type:** a day may contain boxing AND dinner with friends. Mark the dinner slot as `friends` or `family` if applicable, or switch back to a normal planned meal. The user typically has one of each per week; do **not** enforce or auto-compensate. No calorie penalties, fasting, or extra exercise after social meals. Social dinner is excluded from shopping calculations and should not be assigned invented nutrition values.

Day type changes suggestions and cooking convenience, not a rigid separate diet. Keep protein broadly constant. Boxing favors tolerable carb-containing snacks before/after class; busy favors <=15-minute meals; sick prioritizes hydration and palatable meals without aggressive restriction; rest is normal eating. Do **not** program arbitrary calorie deductions for missed workouts. User may change activities late in the day without retroactively changing locked/selected meals.

### 2) ¿QUÉ COMO? — meal shuffler

- Fast, enjoyable protein + side chooser for lunch and dinner.
- Show protein and accompaniment independently. Separate **lock/unlock** toggles, one **Otra opción** action, and individual change controls. Locked component never changes.
- Allow choosing manually, randomizing, favoriting pairs, saving directly into today's lunch/dinner.
- Include preset favorite **220 g raw salmon baked + one serving of Sopa de puerro y arvejas** (`fav_salmon_leek_peas`).
- Filter by type of day, available prep time, dislikes/preferences, and optionally favorites. A longer recipe must not appear as a "quick" recommendation. Soup side is valid only if its `soupId` exists.
- Handle empty candidate sets gracefully (suggest removing filters), one-candidate sets, and both-locked state without infinite loops. Prefer avoiding the immediate last result when choices exist.
- Only the **ingredient names + grams** are visible by default. Calories/protein/carbs/fat are under a collapsed, accessible **"Ver nutrición estimada"** disclosure. Macro numbers are approximate and calculated from catalog weights. Clearly label incomplete estimates when a label is missing.
- Ingredient-specific raw vs cooked weight basis is shown where material. A 220 g *raw* salmon remains 220 g raw throughout app and shopping list.

### 3) COCINAR — iChef soup recipe book

Import **all nine** soups from `soups.json`, no missing/duplicate recipes, preserve recipe-local metadata, flavors, categories, prep notes and ingredient grams. Allow search and selecting 1–4 portions. Use kitchen mode (one step per screen, large enough to read while cooking), next/back, optional checkmark completion, and quick return to shopping. No need to offer iChef directions for other meals; ordinary meals need only short instructions and ingredients.

**Mandatory step rendering rule:** for EVERY step, list each **new** ingredient going into the jar **with its numeric weight in grams**, plus instruction, time, temperature, speed and any safety/lid notes. A separate master ingredient list is *not* sufficient. Include a placeholder such as "Sin ingredientes nuevos en este paso" for steps that only blend/mix. Show clear heating-off and hand-mixing states; do not invent numeric settings for missing controls.

**Portion scaling and FONDO broth must exactly follow source logic:**

```
factor = selectedServings / recipe.baseServings // baseServings = 3
roundGrams(x): x>=10 => nearest gram; x>=1 => nearest 0.5 g; x<1 => nearest 0.1 g
brothLiquid = roundGrams(recipe.broth.baseBrothComponentGramsFor3 * factor)
coconut = roundGrams(recipe.coconut.gramsFor3 * factor)

if vegetable:
    water = brothLiquid
    concentrate = roundGrams(water * recipe.broth.vegetableConcentrateGramsPerGramOfWater)
    // add water and frozen vegetal concentrate as TWO SEPARATE gram lines directly to jug
if bone:
    bone = min(brothLiquid, roundGrams(userChosenBoneBrothGramsFor3 * factor))
    water = roundGrams(brothLiquid - bone)
    // add frozen READY-TO-USE bone broth and water separately in grams directly to jug

// Coconut is a fixed ingredient ONLY for Thai de coco, Calabaza and Boniato.
// Do NOT let coconut be an optional global addition or increase total base liquid because of it.
```

Allow per-recipe override of bone broth amount (default 300 g for 3 servings) and vegetable concentrate amount, persist these preferences, and recompute totals. The optional Thai legumes (`none` default, `chickpeas`, `edamame`) select a **single** 45 g/three-portions addition, NOT both; condition the appropriate step (cooked chickpeas ~2–3 minutes, frozen edamame according to packaging ~5–7 minutes) and shopping list. Never show Thai chickpeas in ingredient or nutrition totals when "none" selected.

**Machine safety / uncertainty:** these are home-authored recipes, **not official manufacturer-approved iChef programs**. The exact device/model instructions have NOT been verified. Preserve original `sourceSettingsText` and structured controls, but label settings as indicative/confirm with device manual. Do not assume speed "0.3", a spoon icon or reverse operation exists. Only show reverse as an option if device supports it; for cooking/basket/cap instructions, follow device manual and avoid unsafe generalized claims. When blending hot soup, advise cooling according to manual, stay below max fill, secure appropriate lid, and ramp speed gradually. No high-speed blending of a boiling, overfilled jug. Do not treat total ingredient grams as volume capacity; calculate a conservative *warning* for large batches and direct user to MAX line.

The soup preview, ingredient list, each step, nutrition estimate, and shopping list must use **the same serving/variant resolver** to prevent conflicting amounts.

### 4) COMPRAR — grocery list

- Offer a **lightweight optional shopping plan for next 3–7 days** (default 5), not a required weekly dashboard/calendar. Can initialize from normal work/activity template and editable daily suggestions.
- One-tap meal shuffle/replace while planning; preserve favorite meals where possible. Allow marking any planned meal as social/free/skip and exclude those from groceries.
- Consolidate identical ingredient IDs from each meal (protein+side, templates, scaled soups with selected broth and Thai legume). Show totals in grams, grouped by store category; checkbox purchased, locally persisted.
- Transparent distinction between dry rice vs cooked legumes, frozen ready bone broth vs concentrate and raw vs cooked proteins. Do not merge items with incompatible weight basis. Water can be hidden as a purchasable item, but water **must** remain visible in recipe steps.
- Do not generate food for skipped/social meals, and do not "fix" a flexible meal by adding extra food to other days.
- Allow removing/editing shopping entries as practical.

### 5) AJUSTES / DATA

- Small onboarding; editable wake/sleep targets, work hours, training template / preferred times, meal times, dietary restrictions, protein/calorie targets, typical social dinners, local device preferences. Seed defaults are suggestions, not facts.
- Initially the user has no confirmed current weight; **do not assert** a precise TDEE or automatically calibrate calories. Seed 2,200–2,300 kcal and 150–170 g protein as *editable, provisional*, not as personalized medical advice. Base food recs on balanced meals and adequate energy for workouts. No severe restriction, meal replacement detox or medical prescriptions.
- Creatine 3–5 g/day and whey as needed are background dietary context only, **not reminders or tracking**. Magnesium and omega-3 should not be recommended automatically; they depend on actual dose/diet and advice.
- All storage local. Exports/imports of **schema-versioned JSON** with validation (Zod or equivalent); show summary and explicit approval before replacing data, offer clear errors. Users should retain their edits through app upgrades and seed revisions; provide migrations.
- Personal settings and seeds must be separated: ship editable data, keep original seed files unchanged, and add well-defined user overrides. Avoid storing excessive personal/health data.

## EXPLICITLY OUT OF SCOPE — DO NOT IMPLEMENT

Notifications, local notifications, web push, training reminders, Hevy integration, exercise sets/reps/weights, step counters, wearable/Apple Health sync, body weight trends, waist graphs, mood/mental health/sleep tracking, habit streaks or checklists, calorie diary, food logging enforcement, AI chat/food generation, barcode scanner, pantry inventory, user accounts, cloud sync, a visible weekly dashboard, analytics or monetization. There should be NO button or dead stub teasing any of these features.

## User experience and data consistency

- **All UI copy MUST be Spanish (`es-UY`).** Source code and developer documentation may be in English.
- Large touch targets; readable recipe cooking mode; high contrast; clear ingredient weight units.
- Navigation should feature Hoy, ¿Qué como?, Cocinar, Comprar, Ajustes. Bottom navigation on mobile if usable.
- Use a small number of screens, not an enterprise administrative app.
- Protein/side choice must be reversible with immediate visible effects and no silent data loss.
- Use real content from seed JSON; no lorem ipsum and no fake user measurements.
- No daily pass/fail scoring, guilt language or diet-punishment messaging.
- Confirm type/day date in `America/Montevideo` and guard against timezone/date rollover issues.

## Deterministic data and nutrition calculations

- Implement a single `resolveSoup(recipe, portions, options)` pure function returning step additions, ingredient totals, liquid breakdown, and nutrition/shopping ingredients; use it everywhere.
- Implement `resolveMeal(protein, side)` and `calculateNutrition(ingredients)`. Multiplying generic per-100g values by `grams/100` is valid only when `weightBasis` agrees. Ingredients without macros or exact brand labels must be flagged as unknown/incomplete, never set to zero silently. Water truly has zero macros.
- Build app seed hydration/migration path that does not overwrite user selections after app update.
- No hard-coded output times, calories, or ingredients in JSX: render from typed data.
- Distinguish estimates from known label values in visual copy.

## Tests that MUST pass

1. Exactly 9 soups; each recipe references valid ingredient IDs in foods catalog.
2. All four serving scales render ingredient grams correctly. 2 servings of "Miso y shiitake" updates shiitake, miso, water and concentrate consistently across preview, steps and groceries.
3. Broth vegetable uses separate **water/concentrate** grams; bone uses separate **ready bone broth/water** grams. No diluted broth unit in ml.
4. Coconut remains fixed and appears on appropriate recipe steps only for Thai, Calabaza and Boniato; never a global toggle.
5. Thai with `none` contains zero chickpeas/edamame in steps/shopping/nutrition; alternatives never both at once.
6. Every iChef step renders ingredients added at that step with grams, plus available time, speed, temperature and readable safety notes.
7. Soup Calabaza never offers turmeric as an ingredient; source adaptation documented.
8. `fav_salmon_leek_peas` resolves salmon 220 g **raw** plus one serving of the correct soup. It can be selected in daily dinner and reflected in shopping.
9. `strength` -> `busy` changes suggestion suitability, does NOT erase already chosen meals or apply automatic calorie punishment.
10. Social dinner is independent of activity and excluded from shopping. Ability to retain friend's dinner alongside a boxing day.
11. Randomizer handles locked protein, locked side, both locked, one option and zero options without loops or phantom matches.
12. Macros collapsed on initial render and shown ONLY after user expands (including estimate disclaimers and missing-label warnings).
13. Shopping aggregation sums exact ingredient weights of multiple repeated dishes, using proper soup scaling and no double counting.
14. Edit preferences, select meals, reload page, remain offline, keep user data. JSON export then import round-trip preserves profile and favorites after user confirmation.
15. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all complete successfully.

## Required completion behavior

Make reasonable engineering defaults. Do not stop to ask questions unless literally blocked. Use the source inputs faithfully and document anything uncertain. Implement end-to-end, **run the commands/tests/build**, fix errors, then summarize what is done and what remains manual (especially iChef model settings and HTTPS hosting for install). The app must be usable offline with real seeded content, not just design files.
