import type { MealSlot } from '../../domain/day/slots';
import type { SoupIngredientIds } from '../../domain/meals/filters';
import { pickCombo } from '../../domain/meals/shuffle';
import type { DayType, MealType } from '../../domain/types';
import { comboCandidates, templateCandidates, type Dietary } from '../shared/candidates';

export function nextSlot(
  mealType: MealType,
  current: MealSlot,
  dayType: DayType,
  dietary: Dietary,
  soupIngredientIds?: SoupIngredientIds,
  rng: () => number = Math.random,
): MealSlot {
  if (mealType === 'breakfast' || mealType === 'snack') {
    const templates = templateCandidates(mealType, dietary, dayType);
    const currentId = current.kind === 'template' ? current.templateId : undefined;
    const pool = templates.length > 1 ? templates.filter((t) => t.id !== currentId) : templates;
    const pick = pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)];
    return pick ? { kind: 'template', templateId: pick.id } : { kind: 'empty' };
  }
  const { proteins, sides } = comboCandidates({ dayType, favoritesOnly: false }, dietary, [], soupIngredientIds);
  const previous = current.kind === 'combo' ? { proteinId: current.proteinId, sideId: current.sideId } : undefined;
  const result = pickCombo({ proteins, sides, rng, ...(previous ? { previous } : {}) });
  return result.status === 'empty' ? { kind: 'empty' } : { kind: 'combo', ...result.combo };
}
