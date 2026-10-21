import { INGREDIENT_CATEGORIES, type IngredientCategory } from '../types';

export function groupByCategory<T extends { category: IngredientCategory }>(
  items: readonly T[],
): { category: IngredientCategory; items: T[] }[] {
  return INGREDIENT_CATEGORIES.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
  })).filter((group) => group.items.length > 0);
}
