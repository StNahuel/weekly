import { foods, ingredientById, proteinById, sideById, templateById } from '../../seed/foods';
import { recipeById } from '../../seed/soups';
import type { Protein, Side } from '../schemas/foods.schema';
import { defaultOptions, getRecipe } from '../soups/testHelpers';
import type { SoupOptions } from '../soups/types';
import type { MealContext } from './resolveMeal';

export function seedContext(prefs: Partial<SoupOptions> = {}): MealContext {
  return {
    soupPrefs: (soupId) => ({ ...defaultOptions(getRecipe(soupId)), ...prefs }),
    catalog: ingredientById,
    recipes: recipeById,
    proteins: proteinById,
    sides: sideById,
    templates: templateById,
  };
}

export function getProtein(id: string): Protein {
  const protein = proteinById.get(id);
  if (!protein) throw new Error(`No protein ${id}`);
  return protein;
}

export function getSide(id: string): Side {
  const side = sideById.get(id);
  if (!side) throw new Error(`No side ${id}`);
  return side;
}

export const seedCatalogs = {
  proteins: foods.proteins,
  sides: foods.sides,
  breakfasts: foods.breakfasts,
  snacks: foods.snacks,
  recipes: recipeById,
};

export function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
