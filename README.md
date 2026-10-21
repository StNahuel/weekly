# weekly

A private, Spanish-language (es-UY) PWA for one person: confirm today's day type, get four meals with gram quantities, swap any of them in place, see the projected daily kcal/protein against an editable target with a propose-and-confirm adjustment, and cook the nine iChef soups step by step with per-step gram weights. Two tabs (Hoy, Sopas) and a settings icon. It runs entirely in the browser and keeps its data on the device in IndexedDB; there is no backend or account. The product spec is `CLAUDE.md` (V2).

## Requirements

Node 22 and pnpm 10 (`packageManager` pins `pnpm@10.33.0`).

## Commands

```sh
pnpm install
pnpm dev          # Vite dev server
pnpm typecheck    # tsc -b --noEmit
pnpm lint         # ESLint flat config
pnpm build        # tsc -b && vite build → dist/
pnpm build:check  # build, then fail if the first-route JS exceeds 250 kB gzip (196.3 kB now)
pnpm preview      # serve dist/ locally over HTTP
pnpm icons        # re-render public/icons/*.png from public/logo.svg
```

Each is a `package.json` script, so `npm run <script>` works too; `build:check` calls `pnpm build` internally. There is no automated test suite by choice: the gate is typecheck + lint + build, and behaviour is checked by hand (see below).

The first-route JS is what Hoy needs on a cold start: the `index.html` script and modulepreload chunks, the `hydrate` and seed chunks that `DbProvider` imports, and the `HoyPage` chunk, each with the chunks they import statically. `scripts/check-bundle.mjs` prints every chunk in that set with its gzip size.

## Stack

Vite 8, React 19, TypeScript 6 (strict; held below 7 for typescript-eslint), Tailwind 4 via `@tailwindcss/vite`, react-router-dom 7 with `createHashRouter`, Dexie 4 + dexie-react-hooks, Zod 4, vite-plugin-pwa 2 (`registerType: 'autoUpdate'`), Lucide icons. The build splits `vendor-react`, `vendor-dexie` and `seed` chunks, and each screen is a lazy route chunk.

## Layout

- `data/`: seed JSON shipped in the bundle — `foods.json` (v2: 3 breakfasts, 3 lunches, 3 snacks, 4 dinners, 4 main proteins, swap pools), `soups.json` (the nine recipes, unchanged v1), `soup-ingredients.json` (the 28 soup-only ingredients the v2 food catalog no longer lists; merged into the catalog at load), `defaults.json` (v2 schedule, targets, rebalancing settings). User edits live in IndexedDB.
- `source/`: the original recipe-book HTML, kept for reference.
- `scripts/`: icon rendering and the bundle budget check.
- `src/domain/`: pure logic — `soups` (scaling/broth resolver), `meals` (slot resolution, lunch composition with lock/roll), `day` (meal model, suggestions, date keys), `nutrition` (day projection, portion bounds, `proposeAdjustment`, status copy) — and Zod schemas.
- `src/seed/`: typed seed loaders. `src/db/`: Dexie schema (v2), migrations from v1, hydration, export/import (v1 backups accepted).
- `src/features/`: `hoy` (cards, chooser, lunch/dinner builders, day status, rebalance card), `sopas` (recipe list, detail, kitchen mode), `ajustes`, `shared`.

## How it behaves

- Soups: `resolveSoup` is the single source for soup grams, so the recipe preview, every kitchen step and the dinner card show the same numbers, matching the source HTML's broth formula at 1–4 servings. Broth is weighed as separate gram lines (water + concentrate, or bone broth + water); coconut is fixed in thai, calabaza and boniato only; the Thai legume is one choice or none; calabaza has no turmeric.
- Meals: breakfast/snack are templates, lunch is a preset or a composed protein + carb + vegetables (protein and carb can be locked and rolled independently; a locked part never changes), dinner is one of four proteins plus one serving of any soup. A social dinner (Amigos/Familia) is independent of the day type.
- Nutrition: macros stay collapsed until "Ver nutrición estimada"; the day status is collapsed until "Ver estado del día". Totals use per-100 g catalog values × grams only when the weight basis matches; ingredients without a label (FONDO products, curry paste) are listed as unknown, never counted as zero. The B3st bar uses its 60 g label (234 kcal, 20 g protein, 21 g carbs, 9.6 g fat, 11 g fiber), stored once as per-100 g values.
- Rebalancing: after any swap the projection updates at once. If the reliably estimable total is more than ±75 kcal from the target (seed 2200, editable in Ajustes), the app offers one bounded change to a meal still ahead in the day — lunch carb first, then fruit/snack, then breakfast — showing old → new grams and the kcal delta. "Aplicar" writes exactly those grams; "No, gracias" changes nothing. It never touches protein, meals marked eaten or locked, social dinners, or the meal just changed, and it says so when the gap can't be resolved.
- Storage: Dexie v2 migrates v1 data in place (favorites and shopping tables dropped; v1 meal choices mapped where they still exist, otherwise left empty with a note). Backups are schema-versioned JSON validated with Zod, with v1 backups accepted; import shows a summary and replaces data only after "Reemplazar datos".

Recipe adaptations and data notes: `docs/ADAPTATIONS.md`.

## Instalar en iPhone

1. `pnpm build` y publicá la carpeta `dist/` en cualquier hosting estático con HTTPS (por ejemplo GitHub Pages). Como la app usa `base: './'` y rutas con `#`, no hacen falta reglas de reescritura.
   El repo ya trae `.github/workflows/pages.yml`: cada push a `main` corre typecheck, lint y build y publica `dist/` en GitHub Pages (activalo una vez en Settings → Pages → Source: **GitHub Actions**). La URL queda en `https://<usuario>.github.io/weekly/`.
2. `pnpm preview` sirve por HTTP: sirve para probar en la computadora, pero el iPhone no ofrece instalarla desde ahí.
3. En el iPhone, abrí la URL HTTPS en Safari → Compartir → **Agregar a inicio**.
4. Abrí la app una vez con conexión: el service worker guarda todo para usarla sin internet.
5. Prueba en modo avión: abrí la app desde el ícono → **Hoy** carga → **Sopas** → Miso y shiitake abre con sus pasos.

Los datos se guardan en ese dispositivo. Usá Ajustes → Exportar respaldo antes de cambiar de teléfono o borrar datos de Safari.

## Probar a mano

1. Hoy: confirmá el día, cambiá la cena con **Cambiar** → aparece el ajuste sugerido (papa 500 → 650 g); probá **Aplicar** y **No, gracias**.
2. Marcá el almuerzo como **Comido** y volvé a cambiar la cena: la propuesta pasa a la merienda o el desayuno.
3. Cena → **Amigos**: el tipo de día no cambia y no hay propuesta.
4. Almuerzo → **Cambiar** → **Armar almuerzo**: fijá la proteína y tocá **Otra opción** varias veces; la proteína no cambia.
5. Sopas → Miso → 2 porciones → **Cocinar paso a paso**: cada paso lista sus gramos.
6. Ajustes: cambiá el objetivo diario, exportá e importá el respaldo.

## Verificar manualmente (modelo iChef)

Estas recetas son caseras, no programas oficiales del fabricante. Las nueve tienen `machineSettingsVerified: false` en `data/soups.json`, y la app muestra los ajustes como indicativos.

- **Velocidades y reversa.** Los pasos usan vel. 0.5, 1, 2 y 5, y "subir gradualmente hasta vel. 6" al triturar. Confirmá que tu modelo tenga esas velocidades. La reversa aparece como "Reversa si tu modelo lo permite".
- **Tapas, vaso medidor, salida de vapor y canasta.** Seguí el manual de tu equipo; la app no indica una configuración única.
- **Capacidad.** El aviso de 1650 g suma pesos, no volumen. La referencia real es la marca MAX de la jarra.
- **Pasta de curry.** Puede tener cúrcuma: revisá la etiqueta.
- **FONDO.** El concentrado vegetal congelado y el caldo de huesos listo para usar son productos distintos; la app los pesa por separado.

Also manual, for the developer:

- **Offline / service worker.** `pnpm build && pnpm preview`, open it on desktop, check DevTools → Application → Service Workers shows `activated`, tick Offline, reload: Hoy still renders.
- **Icons.** `public/logo.svg` is the only icon input. After changing it, run `pnpm icons` and commit the PNGs in `public/icons/`.
