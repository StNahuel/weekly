import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../db';
import type { SoupPrefRecord } from '../../db/types';
import type { Recipe } from '../../domain/schemas/soups.schema';
import { resolveSoup } from '../../domain/soups/resolveSoup';
import { SOUP_SERVINGS, type ResolvedSoup, type SoupServings } from '../../domain/soups/types';
import { ingredientById } from '../../seed/foods';
import { recipeById, soups } from '../../seed/soups';
import { buildMealContext } from '../shared/mealContext';

const seedDefault = SOUP_SERVINGS.find((s) => s === soups.servingRules.defaultServings);
if (seedDefault === undefined) throw new Error(`Unsupported default servings ${soups.servingRules.defaultServings}`);
export const DEFAULT_SERVINGS: SoupServings = seedDefault;

export function parseServings(value: string | null): SoupServings {
  return SOUP_SERVINGS.find((s) => String(s) === value) ?? DEFAULT_SERVINGS;
}

export function servingChoices(recipe: Recipe): SoupServings[] {
  return SOUP_SERVINGS.filter(
    (s) => soups.servingRules.availableServings.includes(s) && s >= recipe.minServings && s <= recipe.maxServings,
  );
}

export function resolveForView(recipe: Recipe, prefs: SoupPrefRecord | null, servings: SoupServings): ResolvedSoup {
  const options = buildMealContext(prefs ? [prefs] : []).soupPrefs(recipe.id);
  return resolveSoup(recipe, { ...options, servings }, ingredientById);
}

export type RecipeView = {
  recipe: Recipe | undefined;
  servings: SoupServings;
  setServings: (servings: SoupServings) => void;
  prefs: SoupPrefRecord | null | undefined;
  soup: ResolvedSoup | undefined;
};

export function useRecipeView(recipeId: string): RecipeView {
  const [params, setParams] = useSearchParams();
  const servings = parseServings(params.get('p'));
  const recipe = recipeById.get(recipeId);
  const prefs = useLiveQuery(async () => (await db.soupPrefs.get(recipeId)) ?? null, [recipeId]);
  const soup = useMemo(
    () => (recipe && prefs !== undefined ? resolveForView(recipe, prefs, servings) : undefined),
    [recipe, prefs, servings],
  );
  const setServings = (next: SoupServings) =>
    setParams(
      (current) => {
        current.set('p', String(next));
        return current;
      },
      { replace: true },
    );
  return { recipe, servings, setServings, prefs, soup };
}
