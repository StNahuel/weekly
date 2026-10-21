import raw from '../../data/soup-ingredients.json';
import { soupIngredientsSchema } from '../domain/schemas/soupIngredients.schema';
import { parseSeed } from './parseSeed';

export const soupIngredients = Object.freeze(parseSeed('soup-ingredients.json', soupIngredientsSchema, raw));
