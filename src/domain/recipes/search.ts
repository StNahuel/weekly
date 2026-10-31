import { normalizeSearch } from './normalize';
import type { Category, Recipe } from './types';

export function filterRecipes(recipes: readonly Recipe[], query: string, category: Category | null): Recipe[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return recipes.filter(
    (r) => (category === null || r.category === category) && words.every((word) => r.searchText.includes(word)),
  );
}
