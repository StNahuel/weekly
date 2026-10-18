import { ListChecks, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { setPlanMeal } from '../../db/repo';
import type { FavoriteRecord } from '../../db/types';
import type { MealSlot } from '../../domain/day/slots';
import { formatDateKey } from '../../domain/format';
import { soupIngredientLookup, type MealContext } from '../../domain/meals/resolveMeal';
import type { PlannedMeal } from '../../domain/shopping/planLines';
import { SOCIAL_KINDS, type DayType } from '../../domain/types';
import { MEAL_LABELS, SOCIAL_LABELS } from '../hoy/labels';
import { nextSlot } from '../hoy/reshuffle';
import { SlotPicker } from '../hoy/SlotPicker';
import type { Dietary } from '../shared/candidates';
import { sideLabel, soupSlotLabel } from '../shared/sideLabel';

const MARKS = [
  { kind: 'social', label: 'Social' },
  { kind: 'free', label: 'Libre' },
  { kind: 'skip', label: 'Saltar' },
] as const;

type Mark = (typeof MARKS)[number]['kind'];

const UNAVAILABLE = 'Opción no disponible';

function slotTitle(slot: MealSlot, ctx: MealContext): string {
  switch (slot.kind) {
    case 'combo': {
      const protein = ctx.proteins.get(slot.proteinId);
      const side = ctx.sides.get(slot.sideId);
      return protein && side ? `${protein.title} + ${sideLabel(side)}` : UNAVAILABLE;
    }
    case 'template':
      return ctx.templates.get(slot.templateId)?.title ?? UNAVAILABLE;
    case 'soup': {
      const recipe = ctx.recipes.get(slot.soupId);
      return recipe ? soupSlotLabel(recipe.title, slot.servings) : UNAVAILABLE;
    }
    case 'social':
      return `Comida social con ${SOCIAL_LABELS[slot.social].toLowerCase()}`;
    case 'free':
      return 'Comida libre';
    case 'skip':
      return 'Sin comida planificada';
    case 'empty':
      return 'Sin opciones con estos filtros';
  }
}

const isMark = (kind: MealSlot['kind']): kind is Mark => MARKS.some((mark) => mark.kind === kind);

type PlannedMealRowProps = {
  meal: PlannedMeal;
  index: number;
  dayType: DayType;
  ctx: MealContext;
  favorites: readonly FavoriteRecord[];
  dietary: Dietary;
};

export function PlannedMealRow({ meal, index, dayType, ctx, favorites, dietary }: PlannedMealRowProps) {
  const [picking, setPicking] = useState(false);
  const { slot, mealType } = meal;
  const save = (next: MealSlot) => setPlanMeal(index, next);
  const reshuffle = () => save(nextSlot(mealType, slot, dayType, dietary, soupIngredientLookup(ctx)));

  const mark = (kind: Mark) => {
    if (slot.kind === kind) return reshuffle();
    return save(kind === 'social' ? { kind, social: SOCIAL_KINDS[0] } : { kind });
  };

  const chip = 'tap rounded-lg px-2 text-sm font-semibold text-muted aria-pressed:bg-surface-2 aria-pressed:text-sage';

  return (
    <section aria-label={`${MEAL_LABELS[mealType]} del ${formatDateKey(meal.date)}`} className="space-y-2 border-t border-border py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">{MEAL_LABELS[mealType]}</p>
          <p className={isMark(slot.kind) ? 'text-muted' : ''}>{slotTitle(slot, ctx)}</p>
        </div>
        {isMark(slot.kind) && (
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">Sin compras</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void reshuffle()}
          className="tap inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 font-semibold"
        >
          <Shuffle aria-hidden="true" size={20} />
          Otra opción
        </button>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="tap inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 font-semibold"
        >
          <ListChecks aria-hidden="true" size={20} />
          Elegir
        </button>
      </div>
      <div role="group" aria-label="Marcar comida" className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1">
        {MARKS.map(({ kind, label }) => (
          <button key={kind} type="button" aria-pressed={slot.kind === kind} onClick={() => void mark(kind)} className={chip}>
            {label}
          </button>
        ))}
      </div>
      {slot.kind === 'social' && (
        <div role="group" aria-label="Con quién" className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1">
          {SOCIAL_KINDS.map((social) => (
            <button
              key={social}
              type="button"
              aria-pressed={slot.social === social}
              onClick={() => void save({ kind: 'social', social })}
              className={chip}
            >
              {SOCIAL_LABELS[social]}
            </button>
          ))}
        </div>
      )}
      {picking && (
        <SlotPicker
          date={meal.date}
          mealType={mealType}
          dayType={dayType}
          slot={slot}
          ctx={ctx}
          favorites={favorites}
          dietary={dietary}
          onClose={() => setPicking(false)}
          saveSlot={save}
        />
      )}
    </section>
  );
}
