import type { Protein, Side, Template } from '../schemas/foods.schema';
import type { SoupIngredientIds } from './filters';
import type { Recipe } from '../schemas/soups.schema';
import { resolveSoup, WATER_ID } from '../soups/resolveSoup';
import { SOUP_SERVINGS, type IngredientCatalog, type ResolvedSoup, type SoupOptions } from '../soups/types';
import type { GramLine, StoreCategory, WeightBasis } from '../types';

export type LineSource = 'protein' | 'side' | 'template';

export type ResolvedLine = {
  ingredientId: string;
  name: string;
  grams: number;
  weightBasis: WeightBasis;
  category: StoreCategory;
  source: LineSource;
};

export type ResolvedMeal = {
  title: string;
  lines: ResolvedLine[];
  prepMinutes: number;
  soup?: ResolvedSoup;
};

export type SoupContext = {
  soupPrefs: (soupId: string) => SoupOptions;
  catalog: IngredientCatalog;
  recipes: ReadonlyMap<string, Recipe>;
};

export type MealContext = SoupContext & {
  proteins: ReadonlyMap<string, Protein>;
  sides: ReadonlyMap<string, Side>;
  templates: ReadonlyMap<string, Template>;
};

function resolveLines(lines: readonly GramLine[], source: LineSource, catalog: IngredientCatalog): ResolvedLine[] {
  return lines.map(({ ingredientId, grams }) => {
    const ingredient = catalog.get(ingredientId);
    if (!ingredient) throw new Error(`Unknown ingredient "${ingredientId}"`);
    const { name, weightBasis, category } = ingredient;
    return { ingredientId, name, grams, weightBasis, category, source };
  });
}

function resolveSide(side: Side, ctx: SoupContext): { lines: ResolvedLine[]; soup?: ResolvedSoup } {
  if (side.kind === 'standard') return { lines: resolveLines(side.ingredients, 'side', ctx.catalog) };
  const recipe = ctx.recipes.get(side.soupId);
  if (!recipe) throw new Error(`Side ${side.id} references unknown soup "${side.soupId}"`);
  const servings = SOUP_SERVINGS.find((s) => s === side.defaultServingsForMeal);
  if (servings === undefined) throw new Error(`Side ${side.id} has unsupported servings ${side.defaultServingsForMeal}`);
  const soup = resolveSoup(recipe, { ...ctx.soupPrefs(side.soupId), servings }, ctx.catalog);
  const lines = soup.shopping
    .filter((a) => a.ingredientId !== WATER_ID)
    .map(({ ingredientId, name, grams, weightBasis, category }) => ({
      ingredientId,
      name,
      grams,
      weightBasis,
      category,
      source: 'side' as const,
    }));
  return { lines, soup };
}

export function soupIngredientLookup(ctx: SoupContext): SoupIngredientIds {
  return (side) => resolveSide(side, ctx).soup?.totals.map((a) => a.ingredientId) ?? [];
}

export function resolveMeal(protein: Protein, side: Side, ctx: SoupContext): ResolvedMeal {
  const resolvedSide = resolveSide(side, ctx);
  return {
    title: `${protein.title} + ${side.title}`,
    lines: [...resolveLines(protein.ingredients, 'protein', ctx.catalog), ...resolvedSide.lines],
    prepMinutes: Math.max(protein.prepMinutes, side.prepMinutes),
    ...(resolvedSide.soup ? { soup: resolvedSide.soup } : {}),
  };
}

export function resolveProteinAlone(protein: Protein, ctx: SoupContext): ResolvedMeal {
  return {
    title: protein.title,
    lines: resolveLines(protein.ingredients, 'protein', ctx.catalog),
    prepMinutes: protein.prepMinutes,
  };
}

export function resolveSideAlone(side: Side, ctx: SoupContext): ResolvedMeal {
  const resolved = resolveSide(side, ctx);
  return {
    title: side.title,
    lines: resolved.lines,
    prepMinutes: side.prepMinutes,
    ...(resolved.soup ? { soup: resolved.soup } : {}),
  };
}

export function resolveComboIds(proteinId: string, sideId: string, ctx: MealContext): ResolvedMeal {
  const protein = ctx.proteins.get(proteinId);
  if (!protein) throw new Error(`Unknown protein "${proteinId}"`);
  const side = ctx.sides.get(sideId);
  if (!side) throw new Error(`Unknown side "${sideId}"`);
  return resolveMeal(protein, side, ctx);
}

export function resolveTemplate(template: Template, catalog: IngredientCatalog): ResolvedMeal {
  return {
    title: template.title,
    lines: resolveLines(template.ingredients, 'template', catalog),
    prepMinutes: template.prepMinutes,
  };
}
