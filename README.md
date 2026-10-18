# weekly

A private, Spanish-language (es-UY) PWA for one person: pick today's day type, get four meal suggestions with gram quantities, shuffle lunch/dinner as protein + side, cook nine iChef soups step by step with per-step gram weights, and build a grocery list for 3–7 days. It runs entirely in the browser and keeps its data on the device in IndexedDB; there is no backend or account. The product spec is `CLAUDE.md`.

## Requirements

Node 22 and pnpm 10 (`packageManager` pins `pnpm@10.33.0`).

## Commands

```sh
pnpm install
pnpm dev          # Vite dev server
pnpm typecheck    # tsc -b --noEmit
pnpm lint         # ESLint flat config
pnpm test         # Vitest, single run (pnpm test:watch to watch)
pnpm build        # tsc -b && vite build → dist/
pnpm build:check  # build, then fail if the first-route JS exceeds 250 kB gzip (196.5 kB now)
pnpm preview      # serve dist/ locally over HTTP
pnpm icons        # re-render public/icons/*.png from public/logo.svg
```

Each is a `package.json` script, so `npm run <script>` works too; `build:check` calls `pnpm build` internally.

The first-route JS is what Hoy needs on a cold start: the `index.html` script and modulepreload chunks, the `hydrate` and seed chunks that `DbProvider` imports, and the `HoyPage` chunk, each with the chunks they import statically. `scripts/check-bundle.mjs` prints every chunk in that set with its gzip size.

## Stack

Vite 8, React 19, TypeScript 6 (strict; held below 7 for typescript-eslint), Tailwind 4 via `@tailwindcss/vite`, react-router-dom 7 with `createHashRouter`, Dexie 4 + dexie-react-hooks, Zod 4, vite-plugin-pwa 2 (`registerType: 'autoUpdate'`), Lucide icons. Tests: Vitest 5, jsdom, Testing Library, fake-indexeddb. The build splits `vendor-react`, `vendor-dexie` and `seed` chunks, and each screen is a lazy route chunk.

## Layout

- `data/`: seed JSON (foods, soups, defaults), shipped in the bundle. User edits live in IndexedDB.
- `source/`: the original recipe-book HTML, kept for parity tests.
- `scripts/`: icon rendering and the bundle budget check.
- `src/domain/`: pure logic (`soups`, `meals`, `day`, `shopping`) and Zod schemas.
- `src/seed/`: typed seed loaders. `src/db/`: Dexie schema, migrations, hydration, export/import.
- `src/features/`: one folder per screen (`hoy`, `quecomo`, `cocinar`, `comprar`, `ajustes`) plus `shared`. `src/test/`: cross-screen UI tests.

## Data and guarantees

`resolveSoup` is the single source for soup grams, so the recipe preview, kitchen steps and grocery list show the same numbers (`src/test/misoTwoServings.test.tsx`), and it matches the source HTML's broth formula for all nine recipes at 1–4 servings (`src/domain/soups/parity.test.ts`). Broth is weighed as separate gram lines (water + concentrate, or bone broth + water), never as a diluted unit in ml (`src/domain/soups/broth.test.ts`); coconut is fixed in thai, calabaza and boniato only (`src/domain/soups/coconut.test.ts`); the Thai legume is one choice or none (`src/domain/soups/thaiLegume.test.ts`); calabaza has no turmeric (`src/domain/soups/calabaza.test.ts`).

Macros stay collapsed until "Ver nutrición estimada" is opened (`src/test/macrosCollapsed.test.tsx`). Changing Musculación to Sin tiempo keeps chosen meals (`src/test/dayTypeChange.test.tsx`). A social dinner keeps the day type and adds nothing to the grocery list (`src/test/socialDinner.test.tsx`).

The Dexie schema is versioned in `src/db/migrations.ts`. On start, `hydrate` fills missing profile, seed favorites and soup preferences without overwriting edits, and a deleted seed favorite stays deleted (`src/db/hydrate.test.ts`). Data survives a remount (`src/test/persistence.test.tsx`). Backups are schema-versioned JSON validated with Zod; importing shows a summary and replaces data only after "Reemplazar datos" (`src/test/exportImport.test.tsx`). A backup without a profile gets the seed profile back (`src/db/import.test.ts`).

Recipe adaptations and data notes: `docs/ADAPTATIONS.md`.

## Instalar en iPhone

1. `pnpm build` y publicá la carpeta `dist/` en cualquier hosting estático con HTTPS (por ejemplo GitHub Pages). Como la app usa `base: './'` y rutas con `#`, no hacen falta reglas de reescritura.
   El repo ya trae `.github/workflows/pages.yml`: cada push a `main` corre los gates y publica `dist/` en GitHub Pages (activalo una vez en Settings → Pages → Source: **GitHub Actions**). La URL queda en `https://<usuario>.github.io/weekly/`.
2. `pnpm preview` sirve por HTTP: sirve para probar en la computadora, pero el iPhone no ofrece instalarla desde ahí.
3. En el iPhone, abrí la URL HTTPS en Safari → Compartir → **Agregar a inicio**.
4. Abrí la app una vez con conexión: el service worker guarda todo para usarla sin internet.
5. Prueba en modo avión: abrí la app desde el ícono → **Hoy** carga → **Cocinar** → Miso y shiitake abre con sus pasos → **Comprar** muestra la lista.

Los datos se guardan en ese dispositivo. Usá Ajustes → Exportar respaldo antes de cambiar de teléfono o borrar datos de Safari.

## Verificar manualmente (modelo iChef)

Estas recetas son caseras, no programas oficiales del fabricante. Las nueve tienen `machineSettingsVerified: false` en `data/soups.json`, y la app muestra los ajustes como indicativos.

- **Velocidades y reversa.** Los pasos usan vel. 0.5, 1, 2 y 5, y "subir gradualmente hasta vel. 6" al triturar. Confirmá que tu modelo tenga esas velocidades. La reversa aparece como "Reversa si tu modelo lo permite" (`src/features/cocinar/StepCard.test.tsx`).
- **Tapas, vaso medidor, salida de vapor y canasta.** Seguí el manual de tu equipo; la app no indica una configuración única.
- **Capacidad.** El aviso de 1650 g suma pesos, no volumen (`src/domain/soups/resolveSoup.test.ts`). La referencia real es la marca MAX de la jarra.
- **Pasta de curry.** Puede tener cúrcuma: revisá la etiqueta.
- **FONDO.** El concentrado vegetal congelado y el caldo de huesos listo para usar son productos distintos; la app los pesa por separado.

Also manual, for the developer:

- **Offline / service worker.** `pnpm build && pnpm preview`, open it on desktop, check DevTools → Application → Service Workers shows `activated`, tick Offline, reload: Hoy still renders.
- **Icons.** `public/logo.svg` is the only icon input. After changing it (for example, the background treatment), run `pnpm icons` and commit the PNGs in `public/icons/`.
