import { describe, expect, test } from 'vitest';
import { defaultsSchema } from '../domain/schemas/defaults.schema';
import { defaults } from './defaults';
import { ingredientById, proteinById, sideById, templateById } from './foods';
import { parseSeed } from './parseSeed';
import { brothTypeFromDefault, recipeById } from './soups';

describe('seed loaders', () => {
  test('expose recipes and map broth defaults to the long form', () => {
    expect(recipeById.get('papa')?.broth.defaultType).toBe('huesos');
    expect(brothTypeFromDefault('huesos')).toBe('bone_ready');
    expect(brothTypeFromDefault('vegetal')).toBe('vegetable_concentrate');
  });

  test('index the food catalog by id', () => {
    expect(ingredientById.get('salmon')?.weightBasis).toBe('raw');
    expect(proteinById.get('salmon')?.ingredients).toEqual([{ ingredientId: 'salmon', grams: 220 }]);
    expect(sideById.get('soup_verde')?.kind).toBe('soup_ref');
    expect(templateById.get('yogurt_fruit')?.mealType).toBe('snack');
    expect(templateById.get('oats_whey')?.mealType).toBe('breakfast');
  });

  test('parseSeed throws with the failing issue path', () => {
    expect(parseSeed('defaults.json', defaultsSchema, structuredClone(defaults))).toEqual(defaults);

    const broken = { ...structuredClone(defaults), shopping: { ...defaults.shopping, defaultHorizonDays: 'five' } };
    expect(() => parseSeed('defaults.json', defaultsSchema, broken)).toThrow(
      'Seed defaults.json is invalid at "shopping.defaultHorizonDays": Invalid input: expected number, received string',
    );
  });
});
