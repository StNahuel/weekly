import { describe, expect, test } from 'vitest';
import { soups } from '../../seed/soups';
import { getRecipe, gramsById, resolve } from './testHelpers';

const LIQUID_ROLES = new Set(['water', 'concentrate', 'bone_broth', 'coconut']);

describe('portion scaling', () => {
  test('verde for 1', () => {
    expect(gramsById(resolve('verde', { servings: 1 }).totals)).toEqual({
      leek: 35,
      garlic: 1.5,
      olive_oil: 2,
      water: 283,
      fondo_veg_concentrate: 7,
      potato: 17,
      peas: 47,
      black_pepper: 0.2,
      lemon_juice: 5,
    });
  });

  test('verde for 2', () => {
    expect(gramsById(resolve('verde', { servings: 2 }).totals)).toEqual({
      leek: 70,
      garlic: 2.5,
      olive_oil: 4,
      water: 567,
      fondo_veg_concentrate: 14,
      potato: 33,
      peas: 93,
      black_pepper: 0.3,
      lemon_juice: 10,
    });
  });

  test('verde for 3 and 4', () => {
    expect(gramsById(resolve('verde').totals)).toMatchObject({ peas: 140, water: 850, fondo_veg_concentrate: 21 });
    expect(gramsById(resolve('verde', { servings: 4 }).totals)).toMatchObject({
      peas: 187,
      leek: 140,
      water: 1133,
      fondo_veg_concentrate: 28,
    });
  });

  test('thai for 1 keeps the half-gram curry paste', () => {
    expect(gramsById(resolve('thai', { servings: 1 }).totals)).toMatchObject({ curry_paste: 8.5 });
  });

  test('every recipe for 3 reproduces its ingredient list exactly', () => {
    for (const recipe of soups.recipes) {
      const food = resolve(recipe.id).totals.filter((a) => !LIQUID_ROLES.has(a.role));
      const expected = recipe.ingredients.filter((i) => !(recipe.id === 'thai' && i.id === 'chickpeas_cooked'));
      expect(gramsById(food), recipe.id).toEqual(
        Object.fromEntries(expected.map((i) => [i.id, i.gramsForBaseServings])),
      );
    }
  });

  test('thai with chickpeas for 3 reproduces the full list including the legume', () => {
    const food = resolve('thai', { thaiLegume: 'chickpeas' }).totals.filter((a) => !LIQUID_ROLES.has(a.role));
    expect(gramsById(food)).toEqual(
      Object.fromEntries(getRecipe('thai').ingredients.map((i) => [i.id, i.gramsForBaseServings])),
    );
  });
});
