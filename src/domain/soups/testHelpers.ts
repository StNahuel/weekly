import { ingredientById } from '../../seed/foods';
import { brothTypeFromDefault, recipeById, soups } from '../../seed/soups';
import type { Recipe } from '../schemas/soups.schema';
import { BROTH_TYPES, THAI_LEGUMES } from '../types';
import { resolveSoup } from './resolveSoup';
import { SOUP_SERVINGS, type ResolvedAddition, type ResolvedSoup, type SoupOptions } from './types';

export function getRecipe(id: string): Recipe {
  const recipe = recipeById.get(id);
  if (!recipe) throw new Error(`No recipe ${id}`);
  return recipe;
}

export function defaultOptions(recipe: Recipe): SoupOptions {
  return {
    servings: 3,
    brothType: brothTypeFromDefault(recipe.broth.defaultType),
    thaiLegume: recipe.options.thaiLegume?.default ?? 'none',
  };
}

export function resolve(id: string, overrides: Partial<SoupOptions> = {}): ResolvedSoup {
  const recipe = getRecipe(id);
  return resolveSoup(recipe, { ...defaultOptions(recipe), ...overrides }, ingredientById);
}

export function gramsById(additions: ResolvedAddition[]): Record<string, number> {
  return Object.fromEntries(additions.map((a) => [a.ingredientId, a.grams]));
}

export function idGrams(additions: ResolvedAddition[]): [string, number][] {
  return additions.map((a) => [a.ingredientId, a.grams]);
}

export function stepById(soup: ResolvedSoup, step: number) {
  const found = soup.steps.find((s) => s.step === step);
  if (!found) throw new Error(`No step ${step} in ${soup.recipeId}`);
  return found;
}

export function* allVariants(): Generator<{ recipe: Recipe; options: SoupOptions }> {
  for (const recipe of soups.recipes) {
    const legumes = recipe.options.thaiLegume ? THAI_LEGUMES : (['none'] as const);
    for (const servings of SOUP_SERVINGS)
      for (const brothType of BROTH_TYPES)
        for (const thaiLegume of legumes) yield { recipe, options: { servings, brothType, thaiLegume } };
  }
}
