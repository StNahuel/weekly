import { describe, expect, test } from 'vitest';
import { soups } from '../../seed/soups';
import { roundGrams } from './roundGrams';
import { resolve } from './testHelpers';
import { SOUP_SERVINGS } from './types';

describe('parity with the source recipe book', () => {
  test('broth liquid matches the source formula that subtracts native coconut', () => {
    for (const recipe of soups.recipes) {
      const { baseBrothComponentGramsFor3: broth } = recipe.broth;
      const coconut = recipe.coconut.gramsFor3;
      for (const servings of SOUP_SERVINGS) {
        const factor = servings / recipe.baseServings;
        const source = roundGrams((broth + coconut) * factor) - roundGrams(coconut * factor);
        expect(resolve(recipe.id, { servings }).liquids.brothLiquid, `${recipe.id} x${servings}`).toBe(source);
      }
    }
  });

  test('concentrate strength matches the source brothStrength', () => {
    const strength = Object.fromEntries(
      soups.recipes.map((r) => [r.id, r.broth.vegetableConcentrateGramsPerGramOfWater]),
    );
    expect(strength).toEqual({
      miso: 0.02,
      tomyum: 0.02,
      sesamo: 0.02,
      papa: 0.025,
      thai: 0.025,
      calabaza: 0.025,
      tomate: 0.025,
      boniato: 0.025,
      verde: 0.025,
    });
  });
});
