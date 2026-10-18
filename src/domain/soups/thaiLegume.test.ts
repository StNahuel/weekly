import { describe, expect, test } from 'vitest';
import { ingredientById } from '../../seed/foods';
import { calculateNutrition } from '../meals/calculateNutrition';
import type { ThaiLegume } from '../types';
import { resolve } from './testHelpers';

const LEGUMES = ['chickpeas_cooked', 'edamame_cooked'];

function legumeIds(thaiLegume: ThaiLegume) {
  const soup = resolve('thai', { thaiLegume });
  const ids = (lines: { ingredientId: string }[]) =>
    lines.map((l) => l.ingredientId).filter((id) => LEGUMES.includes(id));
  return {
    steps: ids(soup.steps.flatMap((s) => s.additions)),
    totals: ids(soup.totals),
    shopping: ids(soup.shopping),
    stepCount: soup.steps.length,
  };
}

describe('thai legume is a single exclusive choice', () => {
  test('none adds no legume anywhere and drops the legume step', () => {
    expect(legumeIds('none')).toEqual({ steps: [], totals: [], shopping: [], stepCount: 6 });
  });

  test('chickpeas adds only chickpeas', () => {
    const only = ['chickpeas_cooked'];
    expect(legumeIds('chickpeas')).toEqual({ steps: only, totals: only, shopping: only, stepCount: 7 });
  });

  test('edamame adds only edamame', () => {
    const only = ['edamame_cooked'];
    expect(legumeIds('edamame')).toEqual({ steps: only, totals: only, shopping: only, stepCount: 7 });
  });

  test('the selected legume is 45 g for 3 and scales with servings', () => {
    const grams = (servings: 1 | 3) =>
      resolve('thai', { thaiLegume: 'chickpeas', servings }).shopping.find(
        (a) => a.ingredientId === 'chickpeas_cooked',
      )?.grams;
    expect(grams(3)).toBe(45);
    expect(grams(1)).toBe(15);
  });

  test('none adds no legume to the nutrition estimate', () => {
    const nutrition = (thaiLegume: ThaiLegume) => calculateNutrition(resolve('thai', { thaiLegume }).totals, ingredientById);
    const chickpeas = resolve('thai', { thaiLegume: 'chickpeas' }).totals;
    const withoutLegume = chickpeas.filter((a) => !LEGUMES.includes(a.ingredientId));
    expect(nutrition('none')).toEqual(calculateNutrition(withoutLegume, ingredientById));
    expect(nutrition('chickpeas').kcal - nutrition('none').kcal).toBe(74);
    expect(nutrition('chickpeas').protein).toBeGreaterThan(nutrition('none').protein);
  });
});
