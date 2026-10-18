import { describe, expect, test } from 'vitest';
import { foods, ingredientById, templateById } from '../../seed/foods';
import { resolveComboIds, resolveMeal, resolveTemplate } from './resolveMeal';
import { getProtein, getSide, seedContext } from './testHelpers';

const lineTuples = (lines: { ingredientId: string; grams: number; weightBasis: string; source: string }[]) =>
  lines.map((l) => [l.ingredientId, l.grams, l.weightBasis, l.source]);

describe('resolveMeal', () => {
  test('standard side maps catalog lines and takes the longer prep time', () => {
    const meal = resolveMeal(getProtein('salmon'), getSide('rice_broccoli'), seedContext());
    expect(lineTuples(meal.lines)).toEqual([
      ['salmon', 220, 'raw', 'protein'],
      ['rice_dry', 65, 'dry', 'side'],
      ['broccoli', 180, 'raw', 'side'],
      ['olive_oil', 5, 'ready', 'side'],
    ]);
    expect(meal.prepMinutes).toBe(25);
    expect(meal.title).toBe('Salmón al horno + Arroz y brócoli');
    expect(meal.soup).toBeUndefined();
  });

  test('soup side resolves one serving through resolveSoup and leaves water out', () => {
    const meal = resolveMeal(getProtein('chicken'), getSide('soup_miso'), seedContext());
    const side = Object.fromEntries(meal.lines.filter((l) => l.source === 'side').map((l) => [l.ingredientId, l.grams]));
    expect(side).toMatchObject({ shiitake: 40, fondo_veg_concentrate: 5.5 });
    expect(side).not.toHaveProperty('water');
    expect(meal.soup?.servings).toBe(1);
    expect(meal.soup?.liquids.water).toBe(283);
    expect(meal.prepMinutes).toBe(25);
  });

  test('soup side uses the persisted per-recipe prefs', () => {
    const meal = resolveMeal(getProtein('chicken'), getSide('soup_miso'), seedContext({ brothType: 'bone_ready' }));
    const ids = meal.lines.map((l) => [l.ingredientId, l.grams]);
    expect(ids).toContainEqual(['fondo_bone_ready', 100]);
    expect(ids.some(([id]) => id === 'fondo_veg_concentrate')).toBe(false);
  });

  test('fav_salmon_leek_peas is 220 g raw salmon plus one serving of verde', () => {
    const favorite = foods.favoriteCombos.find((f) => f.id === 'fav_salmon_leek_peas');
    if (!favorite) throw new Error('missing seed favorite');
    const meal = resolveComboIds(favorite.proteinId, favorite.sideId, seedContext());
    expect(meal.lines.filter((l) => l.source === 'protein')).toEqual([
      expect.objectContaining({ ingredientId: 'salmon', grams: 220, weightBasis: 'raw' }),
    ]);
    expect(meal.soup).toMatchObject({ recipeId: 'verde', servings: 1 });
    const side = meal.lines.filter((l) => l.source === 'side').map((l) => [l.ingredientId, l.grams]);
    expect(side).toContainEqual(['peas', 47]);
    expect(side).toContainEqual(['leek', 35]);
  });

  test('unknown soup, ingredient and ids throw', () => {
    const side = getSide('soup_miso');
    if (side.kind !== 'soup_ref') throw new Error('soup_miso is a soup side');
    expect(() => resolveMeal(getProtein('chicken'), { ...side, soupId: 'nope' }, seedContext())).toThrow(
      'Side soup_miso references unknown soup "nope"',
    );
    expect(() =>
      resolveMeal(getProtein('chicken'), { ...side, defaultServingsForMeal: 5 }, seedContext()),
    ).toThrow('Side soup_miso has unsupported servings 5');
    const protein = { ...getProtein('chicken'), ingredients: [{ ingredientId: 'ghost', grams: 10 }] };
    expect(() => resolveMeal(protein, getSide('salad'), seedContext())).toThrow('Unknown ingredient "ghost"');
    expect(() => resolveComboIds('ghost', 'salad', seedContext())).toThrow('Unknown protein "ghost"');
    expect(() => resolveComboIds('chicken', 'ghost', seedContext())).toThrow('Unknown side "ghost"');
    expect(resolveComboIds('chicken', 'salad', seedContext()).lines).toHaveLength(5);
  });
});

describe('resolveTemplate', () => {
  test('keeps every template line, including water', () => {
    const template = templateById.get('whey_banana');
    if (!template) throw new Error('missing seed template');
    const meal = resolveTemplate(template, ingredientById);
    expect(lineTuples(meal.lines)).toEqual([
      ['whey_powder', 30, 'powder', 'template'],
      ['banana', 100, 'edible', 'template'],
      ['water', 250, 'ready', 'template'],
    ]);
    expect(meal.prepMinutes).toBe(2);
  });
});
