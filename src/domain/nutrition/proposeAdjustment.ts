import type { DayRecord } from '../day/slots';
import { OIL_ID } from '../meals/lunch';
import type { Template } from '../schemas/foods.schema';
import type { IngredientCatalog } from '../soups/types';
import { MEAL_TYPES, type MealType } from '../types';
import { ADJUSTABLE_BY_MEAL, boundsFor } from './bounds';
import type { DayProjection } from './projectDay';

export type Proposal = {
  mealType: MealType;
  ingredientId: string;
  name: string;
  fromGrams: number;
  toGrams: number;
  kcalDelta: number;
  residualKcal: number;
  reason: 'deficit' | 'surplus';
};

export type UnresolvedReason = 'unknowable' | 'bounds' | 'nothing_ahead';

export type ProposeOptions = {
  target: number;
  tolerance: number;
  now: string;
  mealTimes: Readonly<Record<MealType, string>>;
  changedMealType?: MealType;
};

const oneDecimal = (x: number) => Math.round(x * 10) / 10;
const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

function boundedTarget(ingredientId: string, fromGrams: number, gap: number, catalog: IngredientCatalog) {
  const bounds = boundsFor(ingredientId);
  const kcalPer100 = catalog.get(ingredientId)?.macrosPer100g?.kcal;
  if (!bounds || !kcalPer100) return null;
  const ideal = fromGrams + gap / (kcalPer100 / 100);
  const toGrams = clamp(Math.round(ideal / bounds.step) * bounds.step, bounds.min, bounds.max);
  // Clamping an off-bounds start can move against the gap; skip that line instead.
  if (Math.sign(toGrams - fromGrams) !== Math.sign(gap)) return null;
  return { toGrams, kcalDelta: oneDecimal(((toGrams - fromGrams) * kcalPer100) / 100) };
}

export function proposeAdjustment(
  day: Pick<DayRecord, 'slots' | 'flags'>,
  projection: DayProjection,
  options: ProposeOptions,
  catalog: IngredientCatalog,
): Proposal | { unresolved: UnresolvedReason } | null {
  if (!projection.knowable) return { unresolved: 'unknowable' };
  const gap = options.target - projection.total.kcal;
  if (Math.abs(gap) <= options.tolerance) return null;
  const ahead = MEAL_TYPES.filter((m) => options.mealTimes[m] > options.now);
  if (ahead.length === 0) return { unresolved: 'nothing_ahead' };
  const eligible = (m: MealType) => {
    const { kind } = day.slots[m];
    const { eaten, locked } = day.flags[m];
    return ahead.includes(m) && m !== options.changedMealType && !eaten && !locked && (kind === 'template' || kind === 'lunch');
  };
  for (const { mealType, ingredientIds } of ADJUSTABLE_BY_MEAL) {
    if (!eligible(mealType)) continue;
    const lines = projection.meals[mealType].lines;
    for (const ingredientId of ingredientIds) {
      const line = lines.find((l) => l.ingredientId === ingredientId);
      const move = line && boundedTarget(ingredientId, line.grams, gap, catalog);
      if (!line || !move) continue;
      return {
        mealType,
        ingredientId,
        name: line.name,
        fromGrams: line.grams,
        toGrams: move.toGrams,
        kcalDelta: move.kcalDelta,
        residualKcal: oneDecimal(gap - move.kcalDelta),
        reason: gap > 0 ? 'deficit' : 'surplus',
      };
    }
  }
  return { unresolved: 'bounds' };
}

export function applyProposal(
  day: DayRecord,
  proposal: Proposal,
  templates: ReadonlyMap<string, Template>,
): DayRecord {
  const slot = day.slots[proposal.mealType];
  const { ingredientId, toGrams } = proposal;
  const notInMeal = new Error(`Proposal ingredient "${ingredientId}" is not in this meal`);
  const withSlot = (next: DayRecord['slots'][MealType]) => ({ ...day, slots: { ...day.slots, [proposal.mealType]: next } });
  if (slot.kind === 'template') {
    const template = templates.get(slot.templateId);
    if (!template?.ingredients.some((i) => i.ingredientId === ingredientId)) throw notInMeal;
    return withSlot({ ...slot, gramOverrides: { ...slot.gramOverrides, [ingredientId]: toGrams } });
  }
  if (slot.kind === 'lunch' && ingredientId === slot.carbId) return withSlot({ ...slot, carbGrams: toGrams });
  if (slot.kind === 'lunch' && ingredientId === OIL_ID && slot.oilGrams > 0) return withSlot({ ...slot, oilGrams: toGrams });
  throw notInMeal;
}
