import { describe, expect, test } from 'vitest';
import { ingredientById } from '../../seed/foods';
import { resolveSoup } from './resolveSoup';
import { allVariants, resolve, stepById } from './testHelpers';

const ML = /\bml\b/i;
const BROTH_ROLES = new Set(['water', 'concentrate', 'bone_broth']);

describe('broth is weighed as separate gram lines', () => {
  test('computed broth becomes water + concentrate or bone broth + water, never a diluted unit', () => {
    for (const { recipe, options } of allVariants()) {
      const soup = resolveSoup(recipe, options, ingredientById);
      const brothStepNumbers = recipe.steps
        .filter((s) => s.additions.some((a) => a.kind === 'computed_broth'))
        .map((s) => s.step);
      expect(brothStepNumbers, recipe.id).toHaveLength(1);
      const roles = stepById(soup, brothStepNumbers[0] ?? 0)
        .additions.map((a) => a.role)
        .filter((role) => BROTH_ROLES.has(role));
      const label = `${recipe.id} ${JSON.stringify(options)}`;
      expect(roles, label).toEqual(
        options.brothType === 'vegetable_concentrate' ? ['water', 'concentrate'] : ['bone_broth', 'water'],
      );
      expect(soup.totals.some((a) => a.ingredientId === 'broth'), label).toBe(false);
      expect(JSON.stringify(soup), label).not.toMatch(ML);
    }
  });

  test('bone broth that fills all the liquid leaves a single line', () => {
    const roles = stepById(resolve('papa', { boneBrothGramsFor3: 850 }), 3).additions.map((a) => a.role);
    expect(roles.filter((role) => BROTH_ROLES.has(role))).toEqual(['bone_broth']);
  });

  test('the ml pattern catches a diluted-broth unit', () => {
    expect('500 ml de caldo').toMatch(ML);
  });
});
