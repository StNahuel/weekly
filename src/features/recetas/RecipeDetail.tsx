import { ArrowLeft, ChefHat, Info, ShoppingBasket, Timer } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import { Loading } from '../../app/states/Loading';
import { BTN_PRIMARY, BTN_SECONDARY, CALLOUT, CARD, LINK } from '../../app/ui';
import { addShoppingEntry } from '../../db/repo';
import { servingsLabel } from '../../domain/format';
import type { ResolvedRecipe } from '../../domain/recipes/resolve';
import { DeviceChips } from '../shared/DeviceChips';
import { IngredientList } from '../shared/IngredientList';
import { CATEGORY_LABELS, CATEGORY_TINTS, subtypeLabel } from '../shared/labels';
import { NutritionDisclosure } from '../shared/NutritionDisclosure';
import { capacityText, MACHINE_NOTICE } from './copy';
import { RecipeOptions } from './RecipeOptions';
import { StepOverview } from './StepOverview';
import { recipeSearch, useRecipeView } from './useRecipeView';

// Plates use water for boiling and blanching; a summed total is meaningless, so it shows per step.
const COOKING_WATER = new Set(['water', 'ice']);

function minutesText({ recipe, method, minutes }: ResolvedRecipe): string {
  if (recipe.kind === 'soupMeal' && method === 'meal') {
    return `≈ ${String(minutes)} min haciendo la sopa · ${String(recipe.minutesWithPreparedSoup)} min con la sopa hecha`;
  }
  return `≈ ${String(minutes)} min`;
}

function Ingredients({ resolved }: { resolved: ResolvedRecipe }) {
  const servings = servingsLabel(resolved.servings);
  if (resolved.recipe.kind === 'plate') {
    return (
      <section aria-labelledby="ingredients-heading" className={`space-y-3 ${CARD}`}>
        <h2 id="ingredients-heading" className="text-lg font-semibold">{`Ingredientes · ${servings}`}</h2>
        <IngredientList lines={resolved.totals.filter((l) => !COOKING_WATER.has(l.ingredientId))} />
        {resolved.totals.some((l) => COOKING_WATER.has(l.ingredientId)) && (
          <p className="text-sm text-muted">El agua y el hielo se indican en cada paso.</p>
        )}
      </section>
    );
  }
  return (
    <section aria-labelledby="ingredients-heading" className={`space-y-4 ${CARD}`}>
      <h2 id="ingredients-heading" className="text-lg font-semibold">{`Ingredientes · ${servings}`}</h2>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{`Sopa ${resolved.recipe.soup.title}`}</h3>
        <IngredientList lines={resolved.soupLines} label="Ingredientes de la sopa" />
        {resolved.soupTotalGrams !== null && (
          <p className={resolved.capacityWarning ? `${CALLOUT} text-sm` : 'pt-1 text-sm text-muted'}>
            {capacityText(resolved.soupTotalGrams, resolved.capacityWarning)}
          </p>
        )}
      </div>
      {resolved.protein && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{`Proteína: ${resolved.protein.title}`}</h3>
          <IngredientList lines={resolved.otherLines} label="Ingredientes de la proteína" />
        </div>
      )}
    </section>
  );
}

export default function RecipeDetail() {
  const { recipeId = '' } = useParams();
  const navigate = useNavigate();
  const { recipe, prefs, resolved, setServings, setProtein, setMethod } = useRecipeView(recipeId);
  const [added, setAdded] = useState(false);

  if (!recipe) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Receta no encontrada</h1>
        <Empty title="No encontramos esa receta." action={<Link to="/recetas" className={LINK}>Ver recetas</Link>} />
      </div>
    );
  }
  if (!prefs || !resolved) return <Loading />;

  const tint = CATEGORY_TINTS[recipe.category];
  const subtype =
    recipe.kind === 'plate' ? subtypeLabel(recipe.subtype) : resolved.method === 'soup' ? 'Sopa' : subtypeLabel('caldo_con_proteina');
  const usesIchef = resolved.sections.some((s) => s.steps.some((step) => step.device === 'ichef'));
  const search = recipeSearch(resolved.servings, resolved.protein?.id, resolved.method);
  const notes = recipe.kind === 'soupMeal' ? [...recipe.soup.notes, ...recipe.notes] : recipe.notes;
  // History index 0 means the page was opened directly; going back would leave the app.
  const historyIndex = (window.history.state as { idx?: unknown } | null)?.idx;
  const canGoBack = typeof historyIndex === 'number' && historyIndex > 0;

  const addToShopping = async () => {
    const base = { recipeId: recipe.id, servings: resolved.servings };
    const entry = resolved.protein
      ? { ...base, proteinId: resolved.protein.id }
      : resolved.method === 'soup'
        ? { ...base, soupOnly: true }
        : base;
    await addShoppingEntry(entry);
    setAdded(true);
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => void (canGoBack ? navigate(-1) : navigate('/recetas'))} className={LINK}>
        <ArrowLeft aria-hidden="true" size={20} />
        Volver
      </button>
      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-0.5 text-sm font-semibold ${tint.fill} ${tint.ink}`}>
            {CATEGORY_LABELS[recipe.category]}
          </span>
          {subtype && <span className="rounded-full border border-border px-3 py-0.5 text-sm text-muted">{subtype}</span>}
        </div>
        <h1 className="text-2xl font-semibold">{resolved.title}</h1>
        <p className="inline-flex items-center gap-1.5 text-muted">
          <Timer aria-hidden="true" size={18} />
          {minutesText(resolved)}
        </p>
        <DeviceChips devices={resolved.devices} />
        {resolved.summary && <p className="font-semibold text-sky-ink">{resolved.summary}</p>}
        {recipe.kind === 'soupMeal' && (
          <p>
            {recipe.soup.description}
            <span className="block text-sm text-muted">{`${recipe.soup.cuisine} · ${recipe.soup.texture}`}</span>
          </p>
        )}
      </header>

      <RecipeOptions
        recipe={recipe}
        resolved={resolved}
        prefs={prefs}
        onServingsChange={setServings}
        onProteinChange={setProtein}
        onMethodChange={setMethod}
      />

      <Ingredients resolved={resolved} />

      <StepOverview sections={resolved.sections} parallelSections={resolved.sections.length > 1} />

      <NutritionDisclosure estimate={resolved.nutritionPerPortion} />

      {usesIchef && (
        <p className={`flex gap-2 text-sm ${CALLOUT}`}>
          <Info aria-hidden="true" size={20} className="shrink-0" />
          {MACHINE_NOTICE}
        </p>
      )}
      {notes.length > 0 && (
        <ul aria-label="Notas" className="space-y-1 text-sm text-muted">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-2">
        <Link to={`/recetas/${recipe.id}/cocina${search}`} className={BTN_PRIMARY}>
          <ChefHat aria-hidden="true" size={20} />
          Cocinar paso a paso
        </Link>
        <button type="button" onClick={() => void addToShopping()} className={BTN_SECONDARY}>
          <ShoppingBasket aria-hidden="true" size={20} />
          {`Agregar a compras (${servingsLabel(resolved.servings)})`}
        </button>
        <p role="status" className="text-center text-sm font-semibold text-mint-ink empty:hidden">
          {added ? (
            <>
              {'Agregada. '}
              <Link to="/compras" className="underline underline-offset-4">
                Ver lista de compras
              </Link>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
