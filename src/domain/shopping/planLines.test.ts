import { describe, expect, test } from 'vitest';
import type { DaySlots } from '../day/slots';
import { seedContext } from '../meals/testHelpers';
import { planToGroceryLines, type PlannedMeal } from './planLines';

function mealsOf(date: string, slots: DaySlots): PlannedMeal[] {
  return (Object.entries(slots) as [keyof DaySlots, DaySlots[keyof DaySlots]][]).map(([mealType, slot]) => ({
    date,
    mealType,
    slot,
  }));
}

const boxingDay: DaySlots = {
  breakfast: { kind: 'template', templateId: 'oats_whey' },
  lunch: { kind: 'combo', proteinId: 'chicken', sideId: 'rice_broccoli' },
  snack: { kind: 'template', templateId: 'boxing_premeal' },
  dinner: { kind: 'social', social: 'friends' },
};

describe('planToGroceryLines', () => {
  test('a friends dinner contributes nothing while the other meals do', () => {
    const lines = planToGroceryLines(mealsOf('2026-10-20', boxingDay), seedContext());
    expect(new Set(lines.map((l) => l.mealType))).toEqual(new Set(['breakfast', 'lunch', 'snack']));
    expect(lines.filter((l) => l.mealType === 'lunch').map((l) => [l.ingredientId, l.grams])).toEqual([
      ['chicken_breast', 200],
      ['rice_dry', 65],
      ['broccoli', 180],
      ['olive_oil', 5],
    ]);
    expect(lines.every((l) => l.fromDate === '2026-10-20')).toBe(true);
  });

  test('the same dinner as a planned meal does contribute', () => {
    const planned = { ...boxingDay, dinner: { kind: 'combo', proteinId: 'salmon', sideId: 'salad' } } as const;
    const lines = planToGroceryLines(mealsOf('2026-10-20', planned), seedContext());
    expect(lines.filter((l) => l.mealType === 'dinner').map((l) => l.ingredientId)).toContain('salmon');
  });

  test('a soup slot contributes its scaled soup without water', () => {
    const meals: PlannedMeal[] = [
      { date: '2026-10-20', mealType: 'dinner', slot: { kind: 'soup', soupId: 'miso', servings: 2 } },
    ];
    const lines = planToGroceryLines(meals, seedContext());
    expect(lines.find((l) => l.ingredientId === 'shiitake')?.grams).toBe(80);
    expect(lines.find((l) => l.ingredientId === 'fondo_veg_concentrate')?.grams).toBe(11);
    expect(lines.some((l) => l.ingredientId === 'water')).toBe(false);
  });

  test('an unknown soup id throws', () => {
    const meals: PlannedMeal[] = [
      { date: '2026-10-20', mealType: 'dinner', slot: { kind: 'soup', soupId: 'ghost', servings: 1 } },
    ];
    expect(() => planToGroceryLines(meals, seedContext())).toThrow('Unknown soup "ghost"');
  });

  test('skip, free and empty slots contribute nothing', () => {
    const meals: PlannedMeal[] = [
      { date: '2026-10-20', mealType: 'breakfast', slot: { kind: 'free' } },
      { date: '2026-10-20', mealType: 'lunch', slot: { kind: 'skip' } },
      { date: '2026-10-20', mealType: 'snack', slot: { kind: 'empty' } },
      { date: '2026-10-20', mealType: 'dinner', slot: { kind: 'social', social: 'family' } },
    ];
    expect(planToGroceryLines(meals, seedContext())).toEqual([]);
  });

  test('repeated dinners each contribute their own lines', () => {
    const dinner = { kind: 'combo', proteinId: 'salmon', sideId: 'soup_verde' } as const;
    const meals: PlannedMeal[] = [
      { date: '2026-10-16', mealType: 'dinner', slot: dinner },
      { date: '2026-10-17', mealType: 'dinner', slot: dinner },
    ];
    const salmon = planToGroceryLines(meals, seedContext()).filter((l) => l.ingredientId === 'salmon');
    expect(salmon.map((l) => [l.fromDate, l.grams, l.weightBasis])).toEqual([
      ['2026-10-16', 220, 'raw'],
      ['2026-10-17', 220, 'raw'],
    ]);
  });

  test('an unknown template id throws', () => {
    const meals: PlannedMeal[] = [
      { date: '2026-10-16', mealType: 'breakfast', slot: { kind: 'template', templateId: 'ghost' } },
    ];
    expect(() => planToGroceryLines(meals, seedContext())).toThrow('Unknown template "ghost"');
  });
});
