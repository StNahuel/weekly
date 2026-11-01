import { roundGrams } from '../roundGrams';
import { proteinOf, soupSteps, sumLines, type ResolvedLine, type SoupPrefs } from './resolve';
import { SHOP_SECTIONS, type Catalog, type Recipe, type ShopSection, type Soup } from './types';

export type ShoppingEntry = { key: string; recipeId: string; servings: number; proteinId?: string; soupOnly?: boolean };

export type ShoppingItem = ResolvedLine & { section: ShopSection };

export type SoupBatch = { soupId: string; title: string; portions: number; batches: number[] };

export type ShoppingList = {
  sections: { section: ShopSection; items: ShoppingItem[] }[];
  soupBatches: SoupBatch[];
};

// Splits portions into as few even batches as the soup's largest scale allows (5 → 3 + 2).
export function splitPortions(portions: number, maxPerBatch: number): number[] {
  if (portions <= 0) return [];
  const count = Math.ceil(portions / maxPerBatch);
  const base = Math.floor(portions / count);
  const extra = portions % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

const scaledLines = (steps: readonly { additions: readonly ResolvedLine[] }[], factor: number): ResolvedLine[] =>
  steps.flatMap((s) => s.additions.map((a) => ({ ingredientId: a.ingredientId, name: a.name, grams: roundGrams(a.grams * factor) })));

export function buildShoppingList(
  entries: readonly ShoppingEntry[],
  recipeById: ReadonlyMap<string, Recipe>,
  prefsFor: (soup: Soup) => SoupPrefs,
  catalog: Catalog,
): ShoppingList {
  const lines: ResolvedLine[] = [];
  const soupPortions = new Map<string, { soup: Soup; portions: number }>();

  for (const entry of entries) {
    const recipe = recipeById.get(entry.recipeId);
    if (!recipe) continue;
    if (recipe.kind === 'plate') {
      lines.push(...scaledLines(recipe.steps, entry.servings / recipe.baseServings));
      continue;
    }
    if (!entry.soupOnly) lines.push(...scaledLines(proteinOf(recipe, entry.proteinId).steps, entry.servings / recipe.baseServings));
    const current = soupPortions.get(recipe.soup.id);
    soupPortions.set(recipe.soup.id, { soup: recipe.soup, portions: (current?.portions ?? 0) + entry.servings });
  }

  const soupBatches: SoupBatch[] = [];
  for (const { soup, portions } of soupPortions.values()) {
    const batches = splitPortions(portions, Math.max(...soup.scaleServings));
    soupBatches.push({ soupId: soup.id, title: soup.title, portions, batches });
    for (const size of batches) lines.push(...soupSteps(soup, size, prefsFor(soup)).flatMap((s) => s.additions));
  }

  const items: ShoppingItem[] = sumLines(lines).flatMap((line) => {
    const section = catalog.get(line.ingredientId)?.section;
    return section ? [{ ...line, section }] : [];
  });
  return {
    sections: SHOP_SECTIONS.map((section) => ({
      section,
      items: items.filter((i) => i.section === section).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    })).filter((group) => group.items.length > 0),
    soupBatches,
  };
}
