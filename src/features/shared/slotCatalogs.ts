import type { SlotCatalogs } from '../../domain/day/slots';
import { foods, ingredientById } from '../../seed/foods';
import { recipeById } from '../../seed/soups';

export const SLOT_CATALOGS: SlotCatalogs = {
  breakfasts: foods.breakfasts,
  lunches: foods.lunches,
  snacks: foods.snacks,
  dinners: foods.dinners,
  recipes: recipeById,
  catalog: ingredientById,
};
