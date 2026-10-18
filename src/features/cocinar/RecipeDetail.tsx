import { ArrowLeft, ChefHat, ListPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import { Loading } from '../../app/states/Loading';
import { BTN_PRIMARY, BTN_SECONDARY, CALLOUT, CARD, LINK } from '../../app/ui';
import { formatGrams } from '../../domain/format';
import { groupByCategory } from '../../domain/shopping/aggregate';
import type { AdditionRole } from '../../domain/soups/types';
import { NutritionDisclosure } from '../quecomo/NutritionDisclosure';
import { BASIS_LABELS } from '../shared/basisLabels';
import { addSoupToPlan } from '../comprar/usePlan';
import { ADDED_TO_LIST, capacityText, seedTextEs } from './copy';
import { MachineNotice } from './MachineNotice';
import { SoupOptionsPanel } from './SoupOptions';
import { useRecipeView } from './useRecipeView';

const LIQUID_ROLES: readonly AdditionRole[] = ['bone_broth', 'water', 'concentrate', 'coconut'];


export default function RecipeDetail() {
  const { recipeId = '' } = useParams();
  const { recipe, servings, setServings, prefs, soup } = useRecipeView(recipeId);
  const [toast, setToast] = useState<string | null>(null);

  if (!recipe) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Receta no encontrada</h1>
        <Empty title="No encontramos esa sopa." action={<Link to="/cocinar" className={LINK}>Ver todas las sopas</Link>} />
      </div>
    );
  }
  if (prefs === undefined || !soup) return <Loading />;

  const liquids = LIQUID_ROLES.flatMap((role) => soup.totals.filter((a) => a.role === role));
  const addToList = async () => {
    await addSoupToPlan(recipe.id, servings);
    setToast(ADDED_TO_LIST);
  };

  return (
    <div className="space-y-4">
      <Link to="/cocinar" className={LINK}>
        <ArrowLeft aria-hidden="true" size={20} />
        Sopas
      </Link>
      <header className="space-y-1">
        <p className="inline-block rounded-full bg-surface-2 px-3 py-0.5 text-sm font-semibold tracking-wide text-butter-ink uppercase">{`${recipe.flavor} · ${recipe.tag}`}</p>
        <h1 className="text-2xl font-semibold">{recipe.title}</h1>
        <p className="text-muted">{`${recipe.texture} · ${recipe.minutesApprox} min aprox.`}</p>
        <p>{recipe.description}</p>
        {recipe.notes && <p className="text-sm text-muted">{recipe.notes}</p>}
      </header>

      <section aria-label="Directo a la iChef" className="rounded-3xl border-2 border-sage bg-surface p-4 shadow-soft">
        <h2 className="font-semibold text-mint-ink">Directo a la iChef:</h2>
        <ul className="mt-1 space-y-1 text-lg">
          {liquids.map((line) => (
            <li key={line.ingredientId}>
              <span>{`${line.name} — ${formatGrams(line.grams)}`}</span>
              <span className="ml-2 text-sm text-muted">{BASIS_LABELS[line.weightBasis]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">Cada línea se pesa por separado; no hace falta preparar caldo diluido.</p>
      </section>

      <SoupOptionsPanel recipe={recipe} prefs={prefs} servings={servings} onServingsChange={setServings} />

      <section aria-label="Ingredientes" className={`space-y-3 ${CARD}`}>
        <h2 className="text-lg font-semibold">{`Ingredientes para ${servings} ${servings === 1 ? 'porción' : 'porciones'}`}</h2>
        {groupByCategory(soup.totals).map(({ category, items }) => (
          <div key={category}>
            <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{category}</h3>
            <ul className="mt-1 space-y-1">
              {items.map((line) => (
                <li key={line.ingredientId} className="flex items-baseline justify-between gap-3">
                  <span>{`${line.name} — ${formatGrams(line.grams)}`}</span>
                  <span className="shrink-0 text-xs text-muted">{BASIS_LABELS[line.weightBasis]}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className={soup.capacityWarning ? CALLOUT : 'text-sm text-muted'}>
          {capacityText(soup)}
        </p>
      </section>

      <NutritionDisclosure lines={soup.totals} />

      <MachineNotice />
      {recipe.provenance.adaptations.length > 0 && (
        <ul aria-label="Adaptaciones" className="space-y-1 text-sm text-muted">
          {recipe.provenance.adaptations.map((text) => (
            <li key={text}>{seedTextEs(text)}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-2">
        <Link
          to={`/cocinar/${recipe.id}/cocina?p=${servings}`}
          className={BTN_PRIMARY}
        >
          <ChefHat aria-hidden="true" size={20} />
          Cocinar paso a paso
        </Link>
        <button
          type="button"
          onClick={() => void addToList()}
          className={BTN_SECONDARY}
        >
          <ListPlus aria-hidden="true" size={20} />
          Agregar a la lista de compras
        </button>
        <p role="status" className="min-h-6 text-center text-sm font-semibold text-mint-ink">
          {toast}
        </p>
      </div>
    </div>
  );
}
