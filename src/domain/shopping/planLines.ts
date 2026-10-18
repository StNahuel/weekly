import type { MealSlot } from '../day/slots';
import { resolveComboIds, resolveTemplate, type MealContext, type ResolvedLine } from '../meals/resolveMeal';
import { resolveSoup } from '../soups/resolveSoup';
import type { MealType } from '../types';

export type PlannedMeal = { date: string; mealType: MealType; slot: MealSlot };

export type GroceryLine = Omit<ResolvedLine, 'source'> & { fromDate: string; mealType: MealType };

function slotLines(slot: MealSlot, ctx: MealContext): ResolvedLine[] {
  switch (slot.kind) {
    case 'social':
    case 'free':
    case 'skip':
    case 'empty':
      return [];
    case 'combo':
      return resolveComboIds(slot.proteinId, slot.sideId, ctx).lines;
    case 'soup': {
      const recipe = ctx.recipes.get(slot.soupId);
      if (!recipe) throw new Error(`Unknown soup "${slot.soupId}"`);
      const soup = resolveSoup(recipe, { ...ctx.soupPrefs(slot.soupId), servings: slot.servings }, ctx.catalog);
      return soup.shopping.map((line) => ({ ...line, source: 'side' as const }));
    }
    case 'template': {
      const template = ctx.templates.get(slot.templateId);
      if (!template) throw new Error(`Unknown template "${slot.templateId}"`);
      return resolveTemplate(template, ctx.catalog).lines;
    }
  }
}

export function planToGroceryLines(meals: readonly PlannedMeal[], ctx: MealContext): GroceryLine[] {
  return meals.flatMap(({ date, mealType, slot }) =>
    slotLines(slot, ctx).map(({ ingredientId, name, grams, weightBasis, category }) => ({
      ingredientId,
      name,
      grams,
      weightBasis,
      category,
      fromDate: date,
      mealType,
    })),
  );
}
