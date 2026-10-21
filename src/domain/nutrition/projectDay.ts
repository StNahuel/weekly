import type { DayRecord } from '../day/slots';
import { calculateNutrition, type NutritionEstimate } from '../meals/calculateNutrition';
import { resolveSlot, type MealContext, type ResolvedLine } from '../meals/resolveSlot';
import type { MealType } from '../types';

export const KNOWABLE_UNKNOWN_GRAMS_MAX = 30;

export const MEAL_NOUNS: Readonly<Record<MealType, string>> = {
  breakfast: 'desayuno',
  lunch: 'almuerzo',
  snack: 'merienda',
  dinner: 'cena',
};

export type MealStatus = 'estimated' | 'unknown' | 'none';

export type MealProjection = {
  status: MealStatus;
  title: string | null;
  estimate: NutritionEstimate | null;
  lines: ResolvedLine[];
};

export type UnknownItem = { mealType: MealType; kind: 'social' | 'empty' | 'ingredient'; name: string; grams?: number };

export type DayTotal = { kcal: number; protein: number; carbs: number; fat: number };

export type DayProjection = {
  meals: Record<MealType, MealProjection>;
  total: DayTotal;
  complete: boolean;
  unknown: UnknownItem[];
  unknownGrams: number;
  knowable: boolean;
};

const oneDecimal = (x: number) => Math.round(x * 10) / 10;

export function projectDay(day: Pick<DayRecord, 'slots'>, ctx: MealContext): DayProjection {
  const unknown: UnknownItem[] = [];
  const total: DayTotal = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const project = (mealType: MealType): MealProjection => {
    const slot = day.slots[mealType];
    const meal = resolveSlot(slot, ctx);
    if (!meal) {
      if (slot.kind === 'social' || slot.kind === 'empty') {
        unknown.push({ mealType, kind: slot.kind, name: MEAL_NOUNS[mealType] });
        return { status: 'unknown', title: null, estimate: null, lines: [] };
      }
      return { status: 'none', title: null, estimate: null, lines: [] };
    }
    const estimate = calculateNutrition(meal.lines, ctx.catalog);
    for (const missing of estimate.missing) {
      const grams = meal.lines.filter((l) => l.ingredientId === missing.ingredientId).reduce((s, l) => s + l.grams, 0);
      unknown.push({ mealType, kind: 'ingredient', name: missing.name, grams: oneDecimal(grams) });
    }
    total.kcal += estimate.kcal;
    total.protein += estimate.protein;
    total.carbs += estimate.carbs;
    total.fat += estimate.fat;
    return { status: 'estimated', title: meal.title, estimate, lines: meal.lines };
  };
  const meals: Record<MealType, MealProjection> = {
    breakfast: project('breakfast'),
    lunch: project('lunch'),
    snack: project('snack'),
    dinner: project('dinner'),
  };
  const unknownGrams = oneDecimal(unknown.reduce((s, u) => s + (u.grams ?? 0), 0));
  const hasUnknownMeal = unknown.some((u) => u.kind !== 'ingredient');
  return {
    meals,
    total: {
      kcal: total.kcal,
      protein: oneDecimal(total.protein),
      carbs: oneDecimal(total.carbs),
      fat: oneDecimal(total.fat),
    },
    complete: unknown.length === 0,
    unknown,
    unknownGrams,
    knowable: !hasUnknownMeal && unknownGrams <= KNOWABLE_UNKNOWN_GRAMS_MAX,
  };
}
