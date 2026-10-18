import { roundGrams } from '../soups/roundGrams';
import { WATER_ID } from '../soups/resolveSoup';
import { STORE_CATEGORIES, type StoreCategory, type WeightBasis } from '../types';

export type AggregatableLine = {
  ingredientId: string;
  name: string;
  grams: number;
  weightBasis: WeightBasis;
  category: StoreCategory;
};

export type GroceryItem = AggregatableLine & { key: string; purchasable: boolean };

export type GroceryEdits = { removedKeys: readonly string[]; overrides: Readonly<Record<string, number>> };

export const groceryKey = (line: Pick<AggregatableLine, 'ingredientId' | 'weightBasis'>) =>
  `${line.ingredientId}|${line.weightBasis}`;

export function aggregateGroceries(lines: readonly AggregatableLine[]): GroceryItem[] {
  const byKey = new Map<string, GroceryItem>();
  for (const { ingredientId, name, grams, weightBasis, category } of lines) {
    const key = groceryKey({ ingredientId, weightBasis });
    const previous = byKey.get(key);
    byKey.set(
      key,
      previous
        ? { ...previous, grams: previous.grams + grams }
        : { key, ingredientId, name, grams, weightBasis, category, purchasable: ingredientId !== WATER_ID },
    );
  }
  const order = (c: StoreCategory) => STORE_CATEGORIES.indexOf(c);
  return [...byKey.values()]
    .map((item) => ({ ...item, grams: roundGrams(item.grams) }))
    .sort((a, b) => order(a.category) - order(b.category));
}

export function groupByCategory<T extends { category: StoreCategory }>(
  items: readonly T[],
): { category: StoreCategory; items: T[] }[] {
  return STORE_CATEGORIES.map((category) => ({ category, items: items.filter((i) => i.category === category) })).filter(
    (group) => group.items.length > 0,
  );
}

export function applyEdits(items: readonly GroceryItem[], edits: GroceryEdits): GroceryItem[] {
  return items
    .filter((item) => !edits.removedKeys.includes(item.key))
    .map((item) => {
      const override = edits.overrides[item.key];
      return override === undefined ? item : { ...item, grams: override };
    });
}
