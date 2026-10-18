import { describe, expect, test } from 'vitest';
import { ingredientById } from '../../seed/foods';
import { calculateNutrition } from './calculateNutrition';

describe('calculateNutrition', () => {
  test('scales per-100 g macros by grams and rounds totals', () => {
    expect(calculateNutrition([{ ingredientId: 'salmon', grams: 220 }], ingredientById)).toEqual({
      kcal: 458,
      protein: 44,
      carbs: 0,
      fat: 29,
      complete: true,
      missing: [],
    });
  });

  test('water is zero and complete', () => {
    expect(calculateNutrition([{ ingredientId: 'water', grams: 250 }], ingredientById)).toEqual({
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      complete: true,
      missing: [],
    });
  });

  test('a label-only ingredient is reported missing, not counted as zero', () => {
    const result = calculateNutrition(
      [
        { ingredientId: 'salmon', grams: 220 },
        { ingredientId: 'curry_paste', grams: 25 },
      ],
      ingredientById,
    );
    expect(result.missing).toEqual([
      { ingredientId: 'curry_paste', name: 'Pasta de curry verde o amarillo', reason: 'requires_label' },
    ]);
    expect(result.complete).toBe(false);
    expect(result.kcal).toBe(458);
  });

  test('a weight basis that differs from the catalog is a mismatch', () => {
    const cooked = calculateNutrition(
      [{ ingredientId: 'salmon', grams: 220, weightBasis: 'cooked' }],
      ingredientById,
    );
    expect(cooked.missing).toEqual([{ ingredientId: 'salmon', name: 'Salmón', reason: 'basis_mismatch' }]);
    expect(cooked.kcal).toBe(0);
    const raw = calculateNutrition([{ ingredientId: 'salmon', grams: 220, weightBasis: 'raw' }], ingredientById);
    expect(raw).toMatchObject({ kcal: 458, complete: true, missing: [] });
  });

  test('an id outside the catalog is unknown', () => {
    expect(calculateNutrition([{ ingredientId: 'ghost', grams: 10 }], ingredientById).missing).toEqual([
      { ingredientId: 'ghost', name: 'ghost', reason: 'unknown_ingredient' },
    ]);
  });
});
