import { RotateCcw, Trash } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { Empty } from '../../app/states/Empty';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, FIELD } from '../../app/ui';
import { removeGroceryItem, restoreGroceryItems, setGroceryOverride, toggleChecked } from '../../db/repo';
import type { ShoppingPlanRecord } from '../../db/types';
import { formatGrams } from '../../domain/format';
import type { MealContext } from '../../domain/meals/resolveMeal';
import { aggregateGroceries, applyEdits, groupByCategory, type GroceryItem } from '../../domain/shopping/aggregate';
import { planToGroceryLines } from '../../domain/shopping/planLines';
import { BASIS_LABELS } from '../shared/basisLabels';
import { rotatingTint } from '../shared/tints';

type GroceryRowProps = { item: GroceryItem; checked: boolean; edited: boolean };

function GroceryRow({ item, checked, edited }: GroceryRowProps) {
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(item.grams));
  const grams = formatGrams(item.grams);
  const basis = BASIS_LABELS[item.weightBasis];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(draft);
    if (draft === '' || !Number.isFinite(value) || value < 0) return;
    await setGroceryOverride(item.key, value);
    setEditing(false);
  };

  return (
    <li className={`py-1 ${checked ? 'text-muted' : ''}`}>
      <div className="flex items-center gap-2">
        <label className="tap flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            aria-label={`${item.name} — ${grams} · ${basis}`}
            checked={checked}
            onChange={() => void toggleChecked(item.key)}
            className="h-6 w-6 shrink-0 accent-mint-ink"
          />
          <span className="min-w-0">
            <span className={`block ${checked ? 'line-through' : ''}`}>{item.name}</span>
            <span className="block text-xs text-muted">{edited ? `${basis} · editado` : basis}</span>
          </span>
        </label>
        <button
          type="button"
          aria-label={`Editar cantidad de ${item.name}`}
          aria-expanded={editing}
          onClick={() => {
            setDraft(String(item.grams));
            setEditing((value) => !value);
          }}
          className={`tap shrink-0 rounded-full px-3 text-right font-semibold tabular-nums transition-colors duration-150 hover:bg-surface-2 ${checked ? 'line-through' : ''}`}
        >
          {grams}
        </button>
        <button
          type="button"
          aria-label={`Quitar ${item.name}`}
          onClick={() => void removeGroceryItem(item.key)}
          className="tap inline-flex shrink-0 items-center justify-center rounded-full bg-rose text-rose-ink transition-colors duration-150 hover:brightness-95"
        >
          <Trash aria-hidden="true" size={20} />
        </button>
      </div>
      {editing && (
        <form onSubmit={(event) => void submit(event)} className="mt-2 flex flex-wrap items-end gap-2">
          <label htmlFor={inputId} className="sr-only">{`Gramos de ${item.name}`}</label>
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={`${FIELD} w-28`}
          />
          <button type="submit" className={BTN_PRIMARY}>
            Guardar
          </button>
          {edited && (
            <button
              type="button"
              onClick={() => void setGroceryOverride(item.key, undefined).then(() => setEditing(false))}
              className={BTN_SECONDARY}
            >
              <RotateCcw aria-hidden="true" size={20} />
              Volver al cálculo
            </button>
          )}
        </form>
      )}
    </li>
  );
}

export function GroceryList({ plan, ctx }: { plan: ShoppingPlanRecord; ctx: MealContext }) {
  const items = useMemo(
    () => aggregateGroceries(planToGroceryLines(plan.meals, ctx)).filter((item) => item.purchasable),
    [plan.meals, ctx],
  );
  const visible = applyEdits(items, plan);
  const removed = items.length - visible.length;
  const checked = visible.filter((item) => plan.checkedKeys.includes(item.key)).length;

  if (items.length === 0) {
    return (
      <Empty
        title="No hay nada para comprar con este plan."
        hint="Las comidas sociales, libres o salteadas no suman compras."
      />
    );
  }

  return (
    <section aria-labelledby="grocery-heading" className={`space-y-4 ${CARD}`}>
      <h2 id="grocery-heading" className="text-lg font-semibold">
        Lista de compras
      </h2>
      {groupByCategory(visible).map(({ category, items: group }, index) => (
        <div key={category}>
          <h3
            className={`inline-block rounded-full px-3 py-0.5 text-sm font-semibold tracking-wide uppercase ${rotatingTint(index).fill} ${rotatingTint(index).ink}`}
          >
            {category}
          </h3>
          <ul className="mt-1 divide-y divide-border">
            {group.map((item) => (
              <GroceryRow
                key={item.key}
                item={item}
                checked={plan.checkedKeys.includes(item.key)}
                edited={plan.overrides[item.key] !== undefined}
              />
            ))}
          </ul>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="font-semibold">{`${checked} de ${visible.length} marcados`}</p>
        {removed > 0 && (
          <button
            type="button"
            onClick={() => void restoreGroceryItems()}
            className="tap inline-flex items-center gap-2 rounded-full px-3 font-semibold text-mint-ink transition-colors duration-150 hover:bg-mint"
          >
            <RotateCcw aria-hidden="true" size={20} />
            {`Restaurar quitados (${removed})`}
          </button>
        )}
      </div>
    </section>
  );
}
