import type { DietaryExclusions, MealSlot } from '../../domain/day/slots';
import type { DinnerPreset, Template } from '../../domain/schemas/foods.schema';
import type { Recipe } from '../../domain/schemas/soups.schema';
import type { MealType } from '../../domain/types';
import { foods } from '../../seed/foods';
import { recipeById } from '../../seed/soups';

export type TemplateMeal = Exclude<MealType, 'dinner'>;

const TEMPLATES: Readonly<Record<TemplateMeal, readonly Template[]>> = {
  breakfast: foods.breakfasts,
  lunch: foods.lunches,
  snack: foods.snacks,
};

const excludes = (dietary: DietaryExclusions, ids: readonly string[]) =>
  ids.some((id) => dietary.excludedIngredientIds.includes(id));

export function allowedIds(ids: readonly string[], dietary: DietaryExclusions): string[] {
  return ids.filter((id) => !dietary.excludedIngredientIds.includes(id));
}

export function allowedTemplates(mealType: TemplateMeal, dietary: DietaryExclusions): Template[] {
  return TEMPLATES[mealType].filter((t) => !excludes(dietary, t.ingredients.map((i) => i.ingredientId)));
}

export function recipeAllowed(recipe: Recipe, dietary: DietaryExclusions): boolean {
  return !excludes(dietary, recipe.ingredients.map((i) => i.id));
}

export function allowedDinners(dietary: DietaryExclusions): DinnerPreset[] {
  return foods.dinners.filter((d) => {
    const recipe = recipeById.get(d.soupRecipeId);
    return (
      recipe !== undefined &&
      recipeAllowed(recipe, dietary) &&
      !excludes(dietary, d.proteinIngredients.map((i) => i.ingredientId))
    );
  });
}

export function dinnerPresetForProtein(proteinId: string): DinnerPreset | undefined {
  return foods.dinners.find((d) => d.proteinIngredients[0]?.ingredientId === proteinId);
}

export function presetIdOf(slot: MealSlot): string | undefined {
  if (slot.kind === 'template') return slot.templateId;
  if (slot.kind === 'lunch') return slot.presetId;
  return undefined;
}

export function isDinnerPreset(slot: MealSlot, preset: DinnerPreset): boolean {
  return (
    slot.kind === 'dinner' &&
    slot.proteinId === preset.proteinIngredients[0]?.ingredientId &&
    slot.soupRecipeId === preset.soupRecipeId
  );
}
