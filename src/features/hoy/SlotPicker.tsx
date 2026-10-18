import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { setSlot } from '../../db/repo';
import type { FavoriteRecord } from '../../db/types';
import type { MealSlot } from '../../domain/day/slots';
import { soupIngredientLookup, type MealContext } from '../../domain/meals/resolveMeal';
import type { Combo } from '../../domain/meals/shuffle';
import type { DayType, MealType } from '../../domain/types';
import { ComboPicker } from '../quecomo/ComboPicker';
import { FavoritesList } from '../quecomo/FavoritesList';
import { comboCandidates, templateCandidates, type Dietary } from '../shared/candidates';
import { MEAL_LABELS } from './labels';

const FOCUSABLE = 'button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])';

type SlotPickerProps = {
  date: string;
  mealType: MealType;
  dayType: DayType;
  slot: MealSlot;
  ctx: MealContext;
  favorites: readonly FavoriteRecord[];
  dietary: Dietary;
  onClose: () => void;
  saveSlot?: (slot: MealSlot) => Promise<void>;
};

export function SlotPicker(props: SlotPickerProps) {
  const { date, mealType, dayType, slot, ctx, favorites, dietary, onClose, saveSlot } = props;
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [combo, setCombo] = useState<Combo | null>(
    slot.kind === 'combo' ? { proteinId: slot.proteinId, sideId: slot.sideId } : null,
  );

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, []);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialog.current) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const persist = (next: MealSlot) => (saveSlot ? saveSlot(next) : setSlot(date, mealType, next));

  const save = async (next: MealSlot) => {
    await persist(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-bg/80 sm:items-center">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        className="safe-bottom max-h-[90dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-2xl border border-border bg-bg p-4 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {`Elegir ${MEAL_LABELS[mealType].toLowerCase()}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="tap inline-flex items-center gap-2 rounded-xl border border-border px-3 font-semibold"
          >
            <X aria-hidden="true" size={20} />
            Cerrar
          </button>
        </div>
        {mealType === 'breakfast' || mealType === 'snack' ? (
          <ul className="space-y-2">
            {templateCandidates(mealType, dietary).map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  aria-pressed={slot.kind === 'template' && slot.templateId === template.id}
                  onClick={() => void save({ kind: 'template', templateId: template.id })}
                  className="tap flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 text-left aria-pressed:border-sage"
                >
                  {template.title}
                  <span className="shrink-0 text-sm text-muted">{`${template.prepMinutes} min`}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <FavoritesList
              favorites={favorites}
              onUse={(favorite) => void save({ kind: 'combo', proteinId: favorite.proteinId, sideId: favorite.sideId })}
            />
            <ComboPicker
              ctx={ctx}
              candidates={comboCandidates({ dayType, favoritesOnly: false }, dietary, favorites, soupIngredientLookup(ctx))}
              favorites={favorites}
              combo={combo}
              onComboChange={setCombo}
              dateKey={date}
              saveTo={[mealType]}
              saveLabel={saveSlot ? 'Guardar en el plan' : 'Guardar en hoy'}
              onSaved={onClose}
              saveSlot={(_mealType, next) => persist(next)}
            />
          </>
        )}
      </div>
    </div>
  );
}
