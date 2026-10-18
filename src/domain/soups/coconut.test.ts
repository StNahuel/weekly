import { describe, expect, test } from 'vitest';
import { soups } from '../../seed/soups';
import type { SoupOptions } from './types';
import { resolve } from './testHelpers';

const COCONUT_ID = 'coconut_milk_culinary';

describe('coconut is fixed and local to three recipes', () => {
  test('only thai, calabaza and boniato fix coconut', () => {
    expect(soups.recipes.filter((r) => r.coconut.fixed).map((r) => r.id)).toEqual(['thai', 'calabaza', 'boniato']);
  });

  test('each coconut recipe adds it in exactly one step', () => {
    const expected = { thai: [5, 120], calabaza: [4, 90], boniato: [4, 75] };
    for (const [id, [step, grams]] of Object.entries(expected)) {
      const coconutSteps = resolve(id).steps.flatMap((s) =>
        s.additions.filter((a) => a.role === 'coconut').map((a) => [s.step, a.ingredientId, a.grams]),
      );
      expect(coconutSteps, id).toEqual([[step, COCONUT_ID, grams]]);
    }
  });

  test('the other six recipes never contain coconut', () => {
    const others = soups.recipes.filter((r) => !r.coconut.fixed);
    expect(others).toHaveLength(6);
    for (const recipe of others) {
      const soup = resolve(recipe.id);
      const ids = [...soup.steps.flatMap((s) => s.additions), ...soup.totals].map((a) => a.ingredientId);
      expect(ids, recipe.id).not.toContain(COCONUT_ID);
      expect(soup.liquids.coconut).toBe(0);
    }
  });

  test('coconut is not a soup option', () => {
    const options: SoupOptions = {
      servings: 3,
      brothType: 'vegetable_concentrate',
      thaiLegume: 'none',
      // @ts-expect-error coconut cannot be toggled per soup
      coconut: true,
    };
    expect(options.servings).toBe(3);
  });
});
