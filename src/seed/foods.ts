import raw from '../../data/foods.json';
import {
  foodsSchema,
  type DinnerPreset,
  type Foods,
  type Ingredient,
  type Swaps,
  type Template,
} from '../domain/schemas/foods.schema';
import { parseSeed } from './parseSeed';
import { soupIngredients } from './soupIngredients';

export const foods = Object.freeze(parseSeed('foods.json', foodsSchema, raw));

export function indexIngredients(ingredients: readonly Ingredient[]): ReadonlyMap<string, Ingredient> {
  const byId = new Map<string, Ingredient>();
  for (const ingredient of ingredients) {
    if (byId.has(ingredient.id)) throw new Error(`Seed catalog has duplicate ingredient id "${ingredient.id}"`);
    byId.set(ingredient.id, ingredient);
  }
  return byId;
}

export const ingredientById = indexIngredients([...foods.ingredients, ...soupIngredients.ingredients]);
export const templateById: ReadonlyMap<string, Template> = new Map(
  [...foods.breakfasts, ...foods.lunches, ...foods.snacks].map((t) => [t.id, t]),
);
export const lunchById: ReadonlyMap<string, Foods['lunches'][number]> = new Map(foods.lunches.map((l) => [l.id, l]));
export const dinnerById: ReadonlyMap<string, DinnerPreset> = new Map(foods.dinners.map((d) => [d.id, d]));
export const swaps: Swaps = foods.swaps;
