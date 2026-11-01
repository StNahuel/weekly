import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../db';
import { soupPrefsOf } from '../../db/repo';
import { resolveRecipe, SERVING_CHOICES, type ResolvedRecipe, type SoupPrefs } from '../../domain/recipes/resolve';
import type { Recipe } from '../../domain/recipes/types';
import { catalog, recipeById } from '../../seed';

const NO_SOUP: SoupPrefs = { brothType: 'vegetable_concentrate', includeOptional: false };

export function parseServings(value: string | null): number {
  return SERVING_CHOICES.find((s) => String(s) === value) ?? 1;
}

export function recipeSearch(servings: number, proteinId: string | null | undefined): string {
  const params = new URLSearchParams({ p: String(servings) });
  if (proteinId) params.set('prot', proteinId);
  return `?${params.toString()}`;
}

export type RecipeView = {
  recipe: Recipe | undefined;
  prefs: SoupPrefs | undefined;
  resolved: ResolvedRecipe | undefined;
  setServings: (servings: number) => void;
  setProtein: (proteinId: string) => void;
};

export function useRecipeView(recipeId: string): RecipeView {
  const [params, setParams] = useSearchParams();
  const recipe = recipeById.get(recipeId);
  const servings = parseServings(params.get('p'));
  const proteinId = params.get('prot') ?? undefined;

  const prefs = useLiveQuery(async () => {
    if (recipe?.kind !== 'soupMeal') return NO_SOUP;
    return soupPrefsOf(recipe.soup, await db.soupPrefs.get(recipe.soup.id));
  }, [recipe]);

  const resolved = useMemo(() => {
    if (!recipe || !prefs) return undefined;
    const options = proteinId === undefined ? { ...prefs, servings } : { ...prefs, servings, proteinId };
    return resolveRecipe(recipe, options, catalog);
  }, [recipe, prefs, servings, proteinId]);

  const setParam = (key: string, value: string) =>
    setParams(
      (current) => {
        current.set(key, value);
        return current;
      },
      { replace: true },
    );

  return {
    recipe,
    prefs,
    resolved,
    setServings: (next) => setParam('p', String(next)),
    setProtein: (next) => setParam('prot', next),
  };
}
