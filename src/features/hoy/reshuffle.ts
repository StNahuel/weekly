import { dinnerSlotFromPreset, type DietaryExclusions, type MealSlot } from '../../domain/day/slots';
import { pickDifferent } from '../../domain/meals/pick';
import type { MealType } from '../../domain/types';
import { allowedDinners, allowedTemplates, isDinnerPreset, presetIdOf } from './candidates';

export function nextSlot(
  mealType: MealType,
  current: MealSlot,
  dietary: DietaryExclusions,
  rng: () => number = Math.random,
): MealSlot {
  if (mealType === 'dinner') {
    const pool = allowedDinners(dietary);
    const others = pool.filter((d) => !isDinnerPreset(current, d));
    const pick = pickDifferent(others.length > 0 ? others : pool, undefined, rng);
    return pick ? dinnerSlotFromPreset(pick) : { kind: 'empty' };
  }
  const pool = allowedTemplates(mealType, dietary);
  const currentId = presetIdOf(current);
  const pick = pickDifferent(pool, pool.find((t) => t.id === currentId), rng);
  return pick ? { kind: 'template', templateId: pick.id } : { kind: 'empty' };
}
