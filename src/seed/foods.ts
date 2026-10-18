import raw from '../../data/foods.json';
import {
  foodsSchema,
  type Ingredient,
  type Protein,
  type Side,
  type Template,
} from '../domain/schemas/foods.schema';
import { parseSeed } from './parseSeed';

export const foods = Object.freeze(parseSeed('foods.json', foodsSchema, raw));

export const ingredientById: ReadonlyMap<string, Ingredient> = new Map(
  foods.ingredients.map((i) => [i.id, i]),
);
export const proteinById: ReadonlyMap<string, Protein> = new Map(foods.proteins.map((p) => [p.id, p]));
export const sideById: ReadonlyMap<string, Side> = new Map(foods.sides.map((s) => [s.id, s]));
export const templateById: ReadonlyMap<string, Template> = new Map(
  [...foods.breakfasts, ...foods.snacks].map((t) => [t.id, t]),
);
