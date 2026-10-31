import { ArrowLeft, ChefHat, Info, ShoppingBasket, Timer } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import { Loading } from '../../app/states/Loading';
import { BTN_PRIMARY, BTN_SECONDARY, CALLOUT, CARD, LINK } from '../../app/ui';
import { addShoppingEntry } from '../../db/repo';
import { servingsLabel } from '../../domain/format';
import type { ResolvedRecipe } from '../../domain/recipes/resolve';
import type { Recipe } from '../../domain/recipes/types';
import { DeviceChips } from '../shared/DeviceChips';
import { IngredientList } from '../shared/IngredientList';
import { CATEGORY_LABELS, CATEGORY_TINTS, subtypeLabel } from '../shared/labels';
import { NutritionDisclosure } from '../shared/NutritionDisclosure';
import { capacityText, MACHINE_NOTICE } from './copy';
import { RecipeOptions } from './RecipeOptions';
import { recipeSearch, useRecipeView } from './useRecipeView';

function minutesText(recipe: Recipe): string {
  return recipe.kind === 'plate'
    ? `≈ ${recipe.minutes} min`
    : `≈ ${recipe.minutesMakingSoup} min haciendo la sopa · ${recipe.minutesWithPreparedSoup} min con la sopa hecha`;
}

function Ingredients({ resolved }: { resolved: ResolvedRecipe }) {
  const servings = servingsLabel(resolved.servings);
  if (resolved.recipe.kind === 'plate') {
    return (
      <section aria-labelledby="ingredients-heading" className={`space-y-3 ${CARD}`}>
        <h2 id="ingredients-heading" className="text-lg font-semibold">{`Ingredientes · ${servings}`}</h2>
        <IngredientList lines={resolved.totals} />
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
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{`Proteína: ${resolved.protein?.title ?? ''}`}</h3>
        <IngredientList lines={resolved.otherLines} label="Ingredientes de la proteína" />
      </div>
    </section>
  );
}

export default function RecipeDetail() {
  const { recipeId = '' } = useParams();
  const navigate = useNavigate();
  const { recipe, prefs, resolved, setServings, setProtein } = useRecipeView(recipeId);
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
  const subtype = recipe.kind === 'plate' ? subtypeLabel(recipe.subtype) : subtypeLabel('caldo_con_proteina');
  const usesIchef = resolved.sections.some((s) => s.steps.some((step) => step.device === 'ichef'));
  const search = recipeSearch(resolved.servings, resolved.protein?.id);
  const notes = recipe.kind === 'soupMeal' ? [...recipe.soup.notes, ...recipe.notes] : recipe.notes;
  // History index 0 means the page was opened directly; going back would leave the app.
  const historyIndex = (window.history.state as { idx?: unknown } | null)?.idx;
  const canGoBack = typeof historyIndex === 'number' && historyIndex > 0;

  const addToShopping = async () => {
    const entry = resolved.protein
      ? { recipeId: recipe.id, servings: resolved.servings, proteinId: resolved.protein.id }
      : { recipeId: recipe.id, servings: resolved.servings };
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
          {minutesText(recipe)}
        </p>
        <DeviceChips devices={resolved.devices} />
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
      />

      <Ingredients resolved={resolved} />

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
