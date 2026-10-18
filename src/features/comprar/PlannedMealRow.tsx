import { ListChecks, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { BTN_SECONDARY, SEGMENT, SEGMENTS } from '../../app/ui';
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
import { MEAL_TINTS } from '../shared/tints';

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

  const tint = MEAL_TINTS[mealType];

  return (
    <section aria-label={`${MEAL_LABELS[mealType]} del ${formatDateKey(meal.date)}`} className="space-y-2 border-t border-border py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${tint.fill} ${tint.ink}`}>
            {MEAL_LABELS[mealType]}
          </p>
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
          className={BTN_SECONDARY}
        >
          <Shuffle aria-hidden="true" size={20} />
          Otra opción
        </button>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className={BTN_SECONDARY}
        >
          <ListChecks aria-hidden="true" size={20} />
          Elegir
        </button>
      </div>
      <div role="group" aria-label="Marcar comida" className={`${SEGMENTS} grid-cols-3`}>
        {MARKS.map(({ kind, label }) => (
          <button key={kind} type="button" aria-pressed={slot.kind === kind} onClick={() => void mark(kind)} className={SEGMENT}>
            {label}
          </button>
        ))}
      </div>
      {slot.kind === 'social' && (
        <div role="group" aria-label="Con quién" className={`${SEGMENTS} grid-cols-2`}>
          {SOCIAL_KINDS.map((social) => (
            <button
              key={social}
              type="button"
              aria-pressed={slot.social === social}
              onClick={() => void save({ kind: 'social', social })}
              className={SEGMENT}
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
