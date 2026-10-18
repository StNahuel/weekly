import raw from '../../data/soups.json';
import { soupsSchema, type Recipe } from '../domain/schemas/soups.schema';
import type { BrothType } from '../domain/types';
import { parseSeed } from './parseSeed';

export const soups = Object.freeze(parseSeed('soups.json', soupsSchema, raw));

export const recipeById: ReadonlyMap<string, Recipe> = new Map(soups.recipes.map((r) => [r.id, r]));

const BROTH_TYPE_BY_DEFAULT = {
  vegetal: 'vegetable_concentrate',
  huesos: 'bone_ready',
} as const satisfies Record<Recipe['broth']['defaultType'], BrothType>;

export function brothTypeFromDefault(defaultType: Recipe['broth']['defaultType']): BrothType {
  return BROTH_TYPE_BY_DEFAULT[defaultType];
}
