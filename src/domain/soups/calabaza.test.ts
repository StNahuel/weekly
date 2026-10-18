import { describe, expect, test } from 'vitest';
import adaptationsDoc from '../../../docs/ADAPTATIONS.md?raw';
import sourceHtml from '../../../source/original_ichef_recetario.html?raw';
import { foods, ingredientById } from '../../seed/foods';
import { soups } from '../../seed/soups';
import { getRecipe, gramsById, resolve } from './testHelpers';

const isTurmeric = ({ id, name }: { id: string; name: string }) => id === 'turmeric' || /cúrcuma/i.test(name);

describe('calabaza omits turmeric', () => {
  test('the original recipe book did list turmeric for calabaza', () => {
    const match = /<script id="recipes-data" type="application\/json">(.*?)<\/script>/s.exec(sourceHtml);
    const source = JSON.parse(match?.[1] ?? '[]') as { id: string; ingredients: { id: string; name: string }[] }[];
    const calabaza = source.find((r) => r.id === 'calabaza');
    expect(calabaza?.ingredients.some(isTurmeric)).toBe(true);
  });

  test('no recipe, step or catalog entry offers turmeric', () => {
    expect(foods.ingredients.filter(isTurmeric)).toEqual([]);
    for (const recipe of soups.recipes) {
      expect(recipe.ingredients.filter(isTurmeric), recipe.id).toEqual([]);
      const additions = resolve(recipe.id).steps.flatMap((s) => s.additions);
      expect(additions.filter((a) => isTurmeric({ id: a.ingredientId, name: a.name })), recipe.id).toEqual([]);
    }
  });

  test('calabaza uses 1 g of cumin and documents the adaptation', () => {
    expect(gramsById(resolve('calabaza').totals)).toMatchObject({ cumin: 1 });
    expect(getRecipe('calabaza').provenance.adaptations[0]).toBe(
      'Omitted turmeric (1 g) and used cumin (1 g) due to explicit user preference.',
    );
  });

  test('the adaptations doc records the turmeric to cumin change', () => {
    expect(adaptationsDoc).toContain('cúrcuma');
    expect(adaptationsDoc).toContain('comino');
    expect(adaptationsDoc).toContain(getRecipe('calabaza').provenance.adaptations[0]);
  });

  test('curry paste tells the user to check the label for turmeric', () => {
    expect(ingredientById.get('curry_paste')?.notes).toMatch(/cúrcuma/);
  });
});
