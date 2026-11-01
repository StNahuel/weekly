import { Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import { Loading } from '../../app/states/Loading';
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, CALLOUT, CARD, FIELD, SECTION_LABEL } from '../../app/ui';
import {
  clearChecked,
  clearShopping,
  removeShoppingEntry,
  soupPrefsOf,
  toggleChecked,
  updateShoppingEntry,
  useShopping,
  useSoupPrefRecords,
} from '../../db/repo';
import { formatGrams, servingsLabel } from '../../domain/format';
import { displayTitle, proteinOf } from '../../domain/recipes/resolve';
import { buildShoppingList, type ShoppingEntry } from '../../domain/recipes/shopping';
import { catalog, recipeById } from '../../seed';
import { recipeSearch } from '../recetas/useRecipeView';
import { RecipePicker } from './RecipePicker';

const MAX_SERVINGS = 12;
const STEPPER =
  'tap inline-flex items-center justify-center rounded-full border border-border bg-surface text-text transition-colors duration-150 hover:bg-surface-2 disabled:opacity-40';

function EntryRow({ entry }: { entry: ShoppingEntry }) {
  const selectId = useId();
  const recipe = recipeById.get(entry.recipeId);
  if (!recipe) return null;
  const protein = recipe.kind === 'soupMeal' && !entry.soupOnly ? proteinOf(recipe, entry.proteinId) : null;
  const method = entry.soupOnly ? 'soup' : undefined;
  const title = displayTitle(recipe, protein, method);

  return (
    <li className="space-y-2 rounded-2xl border border-border bg-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/recetas/${recipe.id}${recipeSearch(Math.min(entry.servings, 4), protein?.id, method)}`} className="font-semibold underline-offset-4 hover:underline">
          {title}
        </Link>
        <button
          type="button"
          aria-label={`Quitar ${title}`}
          onClick={() => void removeShoppingEntry(entry.key)}
          className={`${STEPPER} shrink-0 border-transparent text-muted`}
        >
          <Trash2 aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Porciones" className="inline-flex items-center gap-2">
          <button
            type="button"
            aria-label="Una porción menos"
            disabled={entry.servings <= 1}
            onClick={() => void updateShoppingEntry(entry.key, { servings: entry.servings - 1 })}
            className={STEPPER}
          >
            <Minus aria-hidden="true" size={18} />
          </button>
          <span className="min-w-24 text-center font-semibold tabular-nums">{servingsLabel(entry.servings)}</span>
          <button
            type="button"
            aria-label="Una porción más"
            disabled={entry.servings >= MAX_SERVINGS}
            onClick={() => void updateShoppingEntry(entry.key, { servings: entry.servings + 1 })}
            className={STEPPER}
          >
            <Plus aria-hidden="true" size={18} />
          </button>
        </div>
        {recipe.kind === 'soupMeal' && protein && (
          <label htmlFor={selectId} className="inline-flex items-center gap-2 text-sm">
            <span className="text-muted">Proteína</span>
            <select
              id={selectId}
              value={protein.id}
              onChange={(event) => void updateShoppingEntry(entry.key, { proteinId: event.target.value })}
              className={FIELD}
            >
              {recipe.proteins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </li>
  );
}

export default function ComprasPage() {
  const shopping = useShopping();
  const prefRecords = useSoupPrefRecords();
  const [picking, setPicking] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const list = useMemo(() => {
    if (!shopping || !prefRecords) return null;
    return buildShoppingList(shopping.entries, recipeById, (soup) => soupPrefsOf(soup, prefRecords.get(soup.id)), catalog);
  }, [shopping, prefRecords]);

  if (!shopping || !list) return <Loading />;
  const checked = new Set(shopping.checked);
  const itemCount = list.sections.reduce((n, s) => n + s.items.length, 0);
  const pendingCount = list.sections.reduce((n, s) => n + s.items.filter((i) => !checked.has(i.ingredientId)).length, 0);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Compras</h1>
        <p className="text-muted">Elegí las comidas que vas a cocinar y se arma la lista sumando los gramos.</p>
      </header>

      <section aria-labelledby="meals-heading" className={`space-y-3 ${CARD}`}>
        <h2 id="meals-heading" className="text-lg font-semibold">
          {`Comidas (${shopping.entries.length})`}
        </h2>
        {shopping.entries.length === 0 ? (
          <p className="text-muted">Todavía no agregaste comidas.</p>
        ) : (
          <ul className="space-y-2">
            {shopping.entries.map((entry) => (
              <EntryRow key={entry.key} entry={entry} />
            ))}
          </ul>
        )}
        <button type="button" onClick={() => setPicking(true)} className={`${BTN_PRIMARY} w-full`}>
          <Plus aria-hidden="true" size={20} />
          Agregar comidas
        </button>
      </section>

      {itemCount === 0 ? (
        shopping.entries.length > 0 && <Empty title="Estas comidas no necesitan compras." />
      ) : (
        <section aria-labelledby="list-heading" className={`space-y-4 ${CARD}`}>
          <header className="flex items-baseline justify-between gap-2">
            <h2 id="list-heading" className="text-lg font-semibold">
              Lista de compras
            </h2>
            <span className="text-sm text-muted">{`${pendingCount} de ${itemCount} pendientes`}</span>
          </header>
          {list.soupBatches.length > 0 && (
            <ul className={`space-y-1 text-sm ${CALLOUT}`}>
              {list.soupBatches.map((batch) => (
                <li key={batch.soupId}>
                  {`Sopa ${batch.title}: ${servingsLabel(batch.portions)}`}
                  {batch.batches.length > 1 ? ` en ${batch.batches.length} tandas (${batch.batches.join(' + ')})` : ' en una tanda'}
                </li>
              ))}
            </ul>
          )}
          {list.sections.map(({ section, items }) => (
            <div key={section}>
              <h3 className={SECTION_LABEL}>{section}</h3>
              <ul className="mt-1">
                {items.map((item) => {
                  const done = checked.has(item.ingredientId);
                  return (
                    <li key={item.ingredientId}>
                      <label className="tap flex cursor-pointer items-center gap-3 border-b border-border/60 py-1">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => void toggleChecked(item.ingredientId)}
                          className="h-5 w-5 shrink-0 accent-mint-ink"
                        />
                        <span className={`flex-1 ${done ? 'text-muted line-through' : ''}`}>{item.name}</span>
                        <span className={`shrink-0 font-semibold tabular-nums ${done ? 'text-muted line-through' : ''}`}>
                          {formatGrams(item.grams)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="text-sm text-muted">El agua y el hielo no se listan. Los pesos son crudos o secos, como en cada receta.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void clearChecked()} disabled={checked.size === 0} className={BTN_SECONDARY}>
              <RotateCcw aria-hidden="true" size={18} />
              Desmarcar
            </button>
            <button type="button" onClick={() => setConfirmClear(true)} className={BTN_SECONDARY}>
              <Trash2 aria-hidden="true" size={18} />
              Vaciar lista
            </button>
          </div>
          {confirmClear && (
            <div role="alertdialog" aria-label="Vaciar lista" className={`space-y-3 ${CALLOUT}`}>
              <p className="font-semibold">¿Quitar todas las comidas y la lista?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmClear(false)} className={BTN_SECONDARY}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmClear(false);
                    void clearShopping();
                  }}
                  className={BTN_DANGER}
                >
                  Vaciar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {picking && <RecipePicker entries={shopping.entries} onClose={() => setPicking(false)} />}
    </div>
  );
}
