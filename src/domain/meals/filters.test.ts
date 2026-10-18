import { describe, expect, test } from 'vitest';
import { foods } from '../../seed/foods';
import { recipeById } from '../../seed/soups';
import type { Side } from '../schemas/foods.schema';
import type { SoupOptions } from '../soups/types';
import { filterCandidates, rankForDay, type CandidateFilter } from './filters';
import { soupIngredientLookup } from './resolveMeal';
import { seedContext } from './testHelpers';

const base: CandidateFilter = {
  proteins: foods.proteins,
  sides: foods.sides,
  dayType: 'rest',
  excludedIngredientIds: [],
  excludedTags: [],
  favoritesOnly: false,
  favorites: foods.favoriteCombos,
  recipes: recipeById,
};
const ids = (items: { id: string }[]) => items.map((i) => i.id);

function lookupWith(soupId: string, prefs: Partial<SoupOptions>) {
  const ctx = seedContext();
  return soupIngredientLookup({ ...ctx, soupPrefs: (id) => ({ ...ctx.soupPrefs(id), ...(id === soupId ? prefs : {}) }) });
}

describe('filterCandidates', () => {
  test('rest keeps the whole catalog in catalog order', () => {
    const result = filterCandidates(base);
    expect(ids(result.proteins)).toEqual(ids(foods.proteins));
    expect(ids(result.sides)).toEqual(ids(foods.sides));
  });

  test('busy keeps only items of 15 minutes or less', () => {
    const result = filterCandidates({ ...base, dayType: 'busy' });
    expect(result.sides.filter((s) => s.kind === 'soup_ref')).toEqual([]);
    expect(ids(result.proteins)).not.toContain('pork');
    expect(ids(result.proteins)).toEqual(['tuna', 'eggs', 'tofu', 'shrimp']);
    expect([...result.proteins, ...result.sides].every((i) => i.prepMinutes <= 15)).toBe(true);
  });

  test('maxPrepMinutes applies on any day type', () => {
    const result = filterCandidates({ ...base, maxPrepMinutes: 15 });
    expect(ids(result.proteins)).not.toContain('salmon');
    expect(ids(filterCandidates(base).proteins)).toContain('salmon');
  });

  test('a soup side whose recipe does not exist is dropped', () => {
    const ghost: Side = {
      id: 'soup_ghost',
      title: 'Sopa fantasma',
      kind: 'soup_ref',
      soupId: 'nope',
      defaultServingsForMeal: 1,
      ingredients: [],
      prepMinutes: 25,
      tags: ['soup'],
      instructions: '',
    };
    const result = filterCandidates({ ...base, sides: [...foods.sides, ghost] });
    expect(ids(result.sides)).not.toContain('soup_ghost');
    expect(ids(result.sides)).toContain('soup_miso');
  });

  test('excluded ingredients drop dishes and soups that contain them', () => {
    const result = filterCandidates({ ...base, excludedIngredientIds: ['shiitake'] });
    expect(ids(result.sides)).not.toContain('zucchini_mushrooms');
    expect(ids(result.sides)).not.toContain('soup_miso');
    expect(ids(result.sides)).toContain('soup_verde');
  });

  test('excluding coconut drops exactly the three soups that add it', () => {
    const soupIngredientIds = soupIngredientLookup(seedContext());
    expect(ids(filterCandidates({ ...base, soupIngredientIds }).sides)).toEqual(ids(foods.sides));
    const kept = ids(
      filterCandidates({ ...base, soupIngredientIds, excludedIngredientIds: ['coconut_milk_culinary'] }).sides,
    );
    expect(ids(foods.sides).filter((id) => !kept.includes(id))).toEqual(['soup_thai', 'soup_calabaza', 'soup_boniato']);
  });

  test('excluding ready bone broth drops a soup only when its prefs use bone broth', () => {
    const excluded = { ...base, excludedIngredientIds: ['fondo_bone_ready'] };
    const bone = filterCandidates({ ...excluded, soupIngredientIds: lookupWith('miso', { brothType: 'bone_ready' }) });
    expect(ids(bone.sides)).not.toContain('soup_miso');
    const vegetable = filterCandidates({
      ...excluded,
      soupIngredientIds: lookupWith('miso', { brothType: 'vegetable_concentrate' }),
    });
    expect(ids(vegetable.sides)).toContain('soup_miso');
  });

  test('excluding edamame drops thai only when edamame is its selected legume', () => {
    const excluded = { ...base, excludedIngredientIds: ['edamame_cooked'] };
    const sides = (thaiLegume: SoupOptions['thaiLegume']) =>
      ids(filterCandidates({ ...excluded, soupIngredientIds: lookupWith('thai', { thaiLegume }) }).sides);
    expect(sides('edamame')).not.toContain('soup_thai');
    expect(sides('none')).toContain('soup_thai');
    expect(sides('chickpeas')).toContain('soup_thai');
  });

  test('excluded tags drop matching dishes', () => {
    const result = filterCandidates({ ...base, excludedTags: ['higher_fat'] });
    expect(ids(result.proteins)).toEqual(ids(foods.proteins).filter((id) => id !== 'pork'));
  });

  test('favoritesOnly keeps the favorite proteins and sides', () => {
    const result = filterCandidates({ ...base, favoritesOnly: true });
    expect(ids(result.proteins)).toEqual(['salmon']);
    expect(ids(result.sides)).toEqual(['soup_verde']);
  });
});

describe('rankForDay', () => {
  test('sick ranks pork last without removing anything', () => {
    const ranked = [...foods.proteins].sort(rankForDay('sick'));
    expect(ranked.at(-1)?.id).toBe('pork');
    expect(ranked).toHaveLength(foods.proteins.length);
    expect(ids(ranked.slice(0, 3))).toEqual(['tuna', 'eggs', 'shrimp']);
  });

  test('strength puts carb sources first, boxing carb or quick sides first', () => {
    const strength = ids([...foods.sides].sort(rankForDay('strength')));
    expect(strength.slice(0, 5)).toEqual(['rice_broccoli', 'potato_tomato', 'quinoa_zucchini', 'rice_zucchini', 'sweet_potato']);
    const boxing = ids([...foods.sides].sort(rankForDay('boxing')));
    expect(boxing.slice(0, 3)).toEqual(['rice_broccoli', 'potato_tomato', 'salad']);
  });
});
