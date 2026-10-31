# weekly

A private, Spanish-language (es-UY) recipe-book PWA for one person. Pick Desayuno, Almuerzo / Cena, Merienda or Jugo, swipe through random recipes (left: otra, right: ver la preparación), cook them step by step with grams per step for iChef, air fryer and hornalla, and build a shopping list from the meals you plan to cook. It runs entirely in the browser and keeps its data on the device in IndexedDB; there is no backend or account. The product spec is `CLAUDE.md`.

## Requirements

Node 22 and pnpm 10 (`packageManager` pins `pnpm@10.33.0`).

## Commands

```sh
pnpm install
pnpm dev          # Vite dev server
pnpm typecheck    # tsc -b --noEmit
pnpm lint         # ESLint flat config
pnpm build        # tsc -b && vite build → dist/
pnpm build:check  # build, then fail if the first-route JS exceeds 250 kB gzip (≈215 kB now)
pnpm preview      # serve dist/ locally over HTTP
pnpm icons        # re-render public/icons/*.png from public/logo.svg
```

There is no automated test suite by choice: the gate is typecheck + lint + build, and behaviour is checked by hand.

## Stack

Vite 8, React 19, TypeScript 6 (strict), Tailwind 4, react-router-dom 7 (`createHashRouter`), Dexie 4 + dexie-react-hooks, Zod 4, vite-plugin-pwa 2 (`autoUpdate`), Lucide icons.

## Layout

- `data/recetario.json`: the recipe book (99 ingredients; 6 desayunos, 52 principales of which 17 are soup + protein, 10 meriendas, 24 jugos). Shipped unchanged.
- `src/domain/recipes/`: `raw.schema.ts` (Zod for the fields the app reads), `normalize.ts` (devices, shop sections, instruction cleanup), `resolve.ts` (scaling, broth choice, optional ingredients, nutrition), `random.ts`, `search.ts`, `shopping.ts`.
- `src/seed/`: parses and normalizes the JSON once. `src/db/`: Dexie schema and migrations, repo hooks, backup.
- `src/features/`: `elegir` (swipe card), `recetas` (list, detail, kitchen mode), `compras`, `ajustes`, `shared`.

## How it behaves

- **Soup meals** (`caldo_con_proteina`) embed a full iChef soup (base 3 portions, scalable 1–4) and six protein options. The detail and kitchen mode show the soup for the selected portions and then the chosen protein. Broth is either water + FONDO vegetal concentrate or ready bone broth + water, each weighed separately; the choice and the optional Thai edamame are remembered per soup.
- **Steps** come from the JSON. The "Agregar: X g; …" prefix repeated in many instructions is removed because the grams are rendered (and scaled) from the step additions.
- **Shopping** sums grams per ingredient across meals; soup portions of the same soup are grouped into batches of up to 4.
- **Storage**: Dexie v3/v4 migrates older installs (keeps soup broth choices and the text-size setting; drops the planner data). Backups are schema v3 JSON; backups from older app versions are rejected with a message.

Data notes: `docs/ADAPTATIONS.md`.

## Instalar en iPhone

1. Cada push a `main` corre typecheck, lint y build y publica `dist/` en GitHub Pages (`.github/workflows/pages.yml`): `https://stnahuel.github.io/weekly/`.
2. En el iPhone, abrí la URL en Safari → Compartir → **Agregar a inicio**.
3. Abrí la app una vez con conexión: el service worker guarda todo para usarla sin internet.

Los datos se guardan en ese dispositivo. Usá Ajustes → Exportar respaldo antes de cambiar de teléfono o borrar datos de Safari.

## Verificar manualmente (equipos)

- **iChef**: las recetas son caseras, no programas oficiales. Confirmá velocidades, reversa, tapa, vaso medidor y canasta con el manual de tu modelo. El aviso de capacidad suma pesos, no volumen: la referencia es la marca MAX.
- **Air fryer**: los tiempos son puntos de partida; manda la temperatura interna (pollo 74 °C, pescado 63 °C). No sobrecargues la cesta.
- **FONDO**: concentrado vegetal y caldo de huesos listo son productos distintos y sin datos nutricionales en la app; sumá los valores del envase.
- **Pasta de curry**: puede tener cúrcuma; revisá la etiqueta.
