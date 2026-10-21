import type { DinnerSlot, LunchSlot, MealSlot } from '../day/slots';
import type { DinnerPreset, Swaps, Template } from '../schemas/foods.schema';
import type { Recipe } from '../schemas/soups.schema';
import { resolveSoup } from '../soups/resolveSoup';
import type { IngredientCatalog, ResolvedSoup, SoupOptions } from '../soups/types';
import type { GramLine, IngredientCategory, WeightBasis } from '../types';
import { OIL_ID } from './lunch';

export type LineSource = 'template' | 'protein' | 'carb' | 'vegetable' | 'oil' | 'soup';

export type ResolvedLine = {
  ingredientId: string;
  name: string;
  grams: number;
  weightBasis: WeightBasis;
  category: IngredientCategory;
  source: LineSource;
};

export type ResolvedMeal = {
  title: string;
  lines: ResolvedLine[];
  prepMinutes: number;
  soup?: ResolvedSoup;
};

export type MealContext = {
  soupPrefs: (recipeId: string) => SoupOptions;
  catalog: IngredientCatalog;
  recipes: ReadonlyMap<string, Recipe>;
  templates: ReadonlyMap<string, Template>;
  dinners: ReadonlyMap<string, DinnerPreset>;
  swaps: Swaps;
};

function resolveLine({ ingredientId, grams }: GramLine, source: LineSource, catalog: IngredientCatalog): ResolvedLine {
  const ingredient = catalog.get(ingredientId);
  if (!ingredient) throw new Error(`Unknown ingredient "${ingredientId}"`);
  const { name, weightBasis, category } = ingredient;
  return { ingredientId, name, grams, weightBasis, category, source };
}

export function resolveTemplate(
  template: Template,
  catalog: IngredientCatalog,
  gramOverrides: Readonly<Record<string, number>> = {},
): ResolvedMeal {
  for (const id of Object.keys(gramOverrides))
    if (!template.ingredients.some((i) => i.ingredientId === id))
      throw new Error(`Override ingredient "${id}" is not in template "${template.id}"`);
  return {
    title: template.title,
    lines: template.ingredients.map((line) =>
      resolveLine({ ...line, grams: gramOverrides[line.ingredientId] ?? line.grams }, 'template', catalog),
    ),
    prepMinutes: template.prepMinutes,
  };
}

function getTemplate(id: string, ctx: MealContext): Template {
  const template = ctx.templates.get(id);
  if (!template) throw new Error(`Unknown template "${id}"`);
  return template;
}

export function resolveLunch(slot: LunchSlot, ctx: MealContext): ResolvedMeal {
  const preset = getTemplate(slot.presetId, ctx);
  const protein = resolveLine({ ingredientId: slot.proteinId, grams: slot.proteinGrams }, 'protein', ctx.catalog);
  const carb = resolveLine({ ingredientId: slot.carbId, grams: slot.carbGrams }, 'carb', ctx.catalog);
  const oil = slot.oilGrams > 0 ? [resolveLine({ ingredientId: OIL_ID, grams: slot.oilGrams }, 'oil', ctx.catalog)] : [];
  const asPreset = [slot.proteinId, slot.carbId].every((id) => preset.ingredients.some((i) => i.ingredientId === id));
  return {
    title: asPreset ? preset.title : `${protein.name} + ${carb.name}`,
    lines: [protein, carb, ...slot.vegetables.map((v) => resolveLine(v, 'vegetable', ctx.catalog)), ...oil],
    prepMinutes: preset.prepMinutes,
  };
}

function presetFor(slot: DinnerSlot, ctx: MealContext): DinnerPreset | undefined {
  return [...ctx.dinners.values()].find(
    (d) => d.proteinIngredients[0]?.ingredientId === slot.proteinId && d.soupRecipeId === slot.soupRecipeId,
  );
}

export function resolveDinner(slot: DinnerSlot, ctx: MealContext): ResolvedMeal {
  const recipe = ctx.recipes.get(slot.soupRecipeId);
  if (!recipe) throw new Error(`Unknown soup "${slot.soupRecipeId}"`);
  const protein = resolveLine({ ingredientId: slot.proteinId, grams: slot.proteinGrams }, 'protein', ctx.catalog);
  const soup = resolveSoup(recipe, { ...ctx.soupPrefs(recipe.id), servings: slot.soupServings }, ctx.catalog);
  const soupLines = soup.totals.map(({ ingredientId, name, grams, weightBasis, category }) => ({
    ingredientId,
    name,
    grams,
    weightBasis,
    category,
    source: 'soup' as const,
  }));
  const preset = presetFor(slot, ctx);
  return {
    title: preset?.title ?? `${protein.name} + ${recipe.title}`,
    lines: [protein, ...soupLines],
    prepMinutes: (preset?.prepMinutesExcludingSoup ?? 0) + recipe.minutesApprox,
    soup,
  };
}

export function resolveSlot(slot: MealSlot, ctx: MealContext): ResolvedMeal | null {
  switch (slot.kind) {
    case 'template':
      return resolveTemplate(getTemplate(slot.templateId, ctx), ctx.catalog, slot.gramOverrides);
    case 'lunch':
      return resolveLunch(slot, ctx);
    case 'dinner':
      return resolveDinner(slot, ctx);
    case 'social':
    case 'skip':
    case 'empty':
      return null;
  }
}
