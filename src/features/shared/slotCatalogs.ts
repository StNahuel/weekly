import type { SlotCatalogs } from '../../domain/day/slots';
import { foods } from '../../seed/foods';
import { recipeById } from '../../seed/soups';

export const SLOT_CATALOGS: SlotCatalogs = {
  proteins: foods.proteins,
  sides: foods.sides,
  breakfasts: foods.breakfasts,
  snacks: foods.snacks,
  recipes: recipeById,
};
