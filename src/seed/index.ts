import type { Defaults } from '../domain/schemas/defaults.schema';
import type { Foods } from '../domain/schemas/foods.schema';
import type { SoupIngredients } from '../domain/schemas/soupIngredients.schema';
import type { Soups } from '../domain/schemas/soups.schema';
import { defaults } from './defaults';
import { foods } from './foods';
import { soupIngredients } from './soupIngredients';
import { soups } from './soups';

export type Seeds = { defaults: Defaults; foods: Foods; soupIngredients: SoupIngredients; soups: Soups };

export const seeds: Seeds = { defaults, foods, soupIngredients, soups };
