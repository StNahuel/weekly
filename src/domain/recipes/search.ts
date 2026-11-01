import { normalizeSearch } from './normalize';
import { CATEGORIES, type Category, type Recipe } from './types';

export const EXTRA_FILTERS = ['sopas', 'ichef'] as const;
export type RecipeFilter = Category | (typeof EXTRA_FILTERS)[number];

export function parseFilter(value: string | null): RecipeFilter | null {
  return [...CATEGORIES, ...EXTRA_FILTERS].find((f) => f === value) ?? null;
}

function matchesFilter(recipe: Recipe, filter: RecipeFilter | null): boolean {
  if (filter === null) return true;
  if (filter === 'sopas') return recipe.kind === 'soupMeal';
  if (filter === 'ichef') return recipe.devices.includes('ichef');
  return recipe.category === filter;
}

export function filterRecipes(recipes: readonly Recipe[], query: string, filter: RecipeFilter | null): Recipe[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return recipes.filter((r) => matchesFilter(r, filter) && words.every((word) => r.searchText.includes(word)));
}
