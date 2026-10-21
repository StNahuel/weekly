import { X } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { BTN_SECONDARY, OPTION_BUTTON } from '../../app/ui';
import { setSlot } from '../../db/repo';
import type { DietaryExclusions, MealSlot } from '../../domain/day/slots';
import { formatGrams } from '../../domain/format';
import type { MealContext } from '../../domain/meals/resolveSlot';
import type { MealType } from '../../domain/types';
import { allowedTemplates, type TemplateMeal } from './candidates';
import { DinnerBuilder } from './DinnerBuilder';
import { MEAL_LABELS } from './labels';
import { LunchBuilder } from './LunchBuilder';

const FOCUSABLE = 'button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])';

type MealChooserProps = {
  date: string;
  mealType: MealType;
  slot: MealSlot;
  ctx: MealContext;
  dietary: DietaryExclusions;
  onSaved: () => void;
  onClose: () => void;
};

function TemplateList({ mealType, slot, ctx, dietary, onSave }: {
  mealType: TemplateMeal;
  slot: MealSlot;
  ctx: MealContext;
  dietary: DietaryExclusions;
  onSave: (slot: MealSlot) => Promise<void>;
}) {
  return (
    <ul className="space-y-2">
      {allowedTemplates(mealType, dietary).map((template) => (
        <li key={template.id}>
          <button
            type="button"
            aria-pressed={slot.kind === 'template' && slot.templateId === template.id}
            onClick={() => void onSave({ kind: 'template', templateId: template.id })}
            className={OPTION_BUTTON}
          >
            <span className="min-w-0">
              <span className="block font-semibold">{template.title}</span>
              <span className="block text-sm text-muted group-aria-pressed:text-mint-ink">
                {template.ingredients
                  .map((line) => `${ctx.catalog.get(line.ingredientId)?.name ?? line.ingredientId} ${formatGrams(line.grams)}`)
                  .join(' · ')}
              </span>
            </span>
            <span className="shrink-0 text-sm text-muted group-aria-pressed:text-mint-ink">{`${template.prepMinutes} min`}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MealChooser({ date, mealType, slot, ctx, dietary, onSaved, onClose }: MealChooserProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);

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

  const save = async (next: MealSlot) => {
    await setSlot(date, mealType, next);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-text/30 sm:items-center">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        className="safe-bottom max-h-[90dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-bg p-4 shadow-soft sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {`Elegir ${MEAL_LABELS[mealType].toLowerCase()}`}
          </h2>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            <X aria-hidden="true" size={20} />
            Cerrar
          </button>
        </div>
        {mealType === 'lunch' ? (
          <LunchBuilder slot={slot} ctx={ctx} dietary={dietary} onSave={save} />
        ) : mealType === 'dinner' ? (
          <DinnerBuilder slot={slot} ctx={ctx} dietary={dietary} onSave={save} />
        ) : (
          <TemplateList mealType={mealType} slot={slot} ctx={ctx} dietary={dietary} onSave={save} />
        )}
      </div>
    </div>
  );
}
