import type { MealType } from '../types';

export type PortionBounds = { min: number; max: number; step: number; default: number };

export const PORTION_BOUNDS: Readonly<Record<string, PortionBounds>> = {
  potato: { min: 250, max: 650, step: 50, default: 500 },
  sweet_potato: { min: 200, max: 550, step: 50, default: 450 },
  rice_dry: { min: 80, max: 200, step: 10, default: 150 },
  whole_wheat_pasta_dry: { min: 80, max: 180, step: 10, default: 135 },
  quinoa_dry: { min: 80, max: 180, step: 10, default: 140 },
  banana: { min: 80, max: 240, step: 40, default: 120 },
  apple: { min: 100, max: 300, step: 50, default: 150 },
  berries: { min: 100, max: 250, step: 50, default: 150 },
  oats_dry: { min: 10, max: 70, step: 10, default: 20 },
  whole_wheat_bread: { min: 40, max: 120, step: 20, default: 80 },
  oat_milk_unsweetened: { min: 150, max: 400, step: 50, default: 250 },
  olive_oil: { min: 5, max: 20, step: 5, default: 10 },
};

export const LUNCH_CARB_IDS = ['potato', 'sweet_potato', 'rice_dry', 'whole_wheat_pasta_dry', 'quinoa_dry'] as const;

export type AdjustableGroup = { mealType: MealType; ingredientIds: readonly string[] };

// Ordered by proposal precedence: lunch starch first, oil last.
export const ADJUSTABLE_BY_MEAL: readonly AdjustableGroup[] = [
  { mealType: 'lunch', ingredientIds: LUNCH_CARB_IDS },
  { mealType: 'snack', ingredientIds: ['banana', 'apple', 'berries', 'oats_dry'] },
  { mealType: 'breakfast', ingredientIds: ['oats_dry', 'banana', 'whole_wheat_bread', 'oat_milk_unsweetened'] },
  { mealType: 'lunch', ingredientIds: ['olive_oil'] },
];

export function boundsFor(ingredientId: string): PortionBounds | undefined {
  return Object.hasOwn(PORTION_BOUNDS, ingredientId) ? PORTION_BOUNDS[ingredientId] : undefined;
}

export function isAdjustable(mealType: MealType, ingredientId: string): boolean {
  return ADJUSTABLE_BY_MEAL.some((g) => g.mealType === mealType && g.ingredientIds.includes(ingredientId));
}
