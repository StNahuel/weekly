import { describe, expect, test } from 'vitest';
import { foods, ingredientById, proteinById, sideById } from './foods';
import { recipeById, soups } from './soups';

const missingIngredients = (ids: string[]) => ids.filter((id) => !ingredientById.has(id));

describe('seed integrity', () => {
  test('ships exactly nine recipes with unique ids', () => {
    expect(soups.recipes).toHaveLength(9);
    expect(recipeById.size).toBe(9);
  });

  test('every recipe references catalog ingredients', () => {
    for (const recipe of soups.recipes) {
      const ids = [
        ...recipe.ingredients.map((i) => i.id),
        recipe.coconut.ingredientId,
        ...recipe.steps.flatMap((step) =>
          step.additions.flatMap((a) => {
            if (a.kind === 'ingredient' || a.kind === 'coconut') return [a.ingredientId];
            if (a.kind === 'selected_thai_legume') return Object.values(a.variantIngredientIds);
            return [];
          }),
        ),
      ];
      expect(missingIngredients(ids), recipe.id).toEqual([]);
    }
  });

  test('every dish and template references catalog ingredients', () => {
    const dishes = [...foods.proteins, ...foods.sides, ...foods.breakfasts, ...foods.snacks];
    for (const dish of dishes) {
      expect(missingIngredients(dish.ingredients.map((l) => l.ingredientId)), dish.id).toEqual([]);
    }
  });

  test('soup sides point at existing recipes', () => {
    const soupSides = foods.sides.filter((s) => s.kind === 'soup_ref');
    expect(soupSides.length).toBeGreaterThan(0);
    for (const side of soupSides) {
      expect(recipeById.has(side.soupId), side.id).toBe(true);
    }
  });

  test('favorite combos point at existing proteins and sides', () => {
    for (const fav of foods.favoriteCombos) {
      expect(proteinById.has(fav.proteinId), fav.id).toBe(true);
      expect(sideById.has(fav.sideId), fav.id).toBe(true);
    }
  });

  test('step grams per ingredient match the recipe ingredient list, except the optional Thai legume', () => {
    const mismatches: { recipeId: string; ingredientId: string; listed: number; inSteps: number }[] = [];
    for (const recipe of soups.recipes) {
      const inSteps = new Map<string, number>();
      for (const step of recipe.steps) {
        for (const a of step.additions) {
          if (a.kind === 'ingredient') {
            inSteps.set(a.ingredientId, (inSteps.get(a.ingredientId) ?? 0) + a.gramsForBaseServings);
          }
        }
      }
      for (const ingredient of recipe.ingredients) {
        const stepGrams = inSteps.get(ingredient.id) ?? 0;
        if (stepGrams !== ingredient.gramsForBaseServings) {
          mismatches.push({
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            listed: ingredient.gramsForBaseServings,
            inSteps: stepGrams,
          });
        }
        inSteps.delete(ingredient.id);
      }
      expect([...inSteps.keys()], `${recipe.id} step ingredients missing from list`).toEqual([]);
    }
    expect(mismatches).toEqual([
      { recipeId: 'thai', ingredientId: 'chickpeas_cooked', listed: 45, inSteps: 0 },
    ]);
  });
});
