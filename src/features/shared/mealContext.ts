import type { SoupPrefRecord } from '../../db/types';
import type { MealContext } from '../../domain/meals/resolveSlot';
import type { SoupOptions } from '../../domain/soups/types';
import { dinnerById, ingredientById, swaps, templateById } from '../../seed/foods';
import { brothTypeFromDefault, recipeById } from '../../seed/soups';

export function buildMealContext(prefs: readonly SoupPrefRecord[]): MealContext {
  const byRecipe = new Map(prefs.map((p) => [p.recipeId, p]));
  const soupPrefs = (soupId: string): SoupOptions => {
    const pref = byRecipe.get(soupId);
    const recipe = recipeById.get(soupId);
    const options: SoupOptions = {
      servings: 3,
      brothType: pref?.brothType ?? brothTypeFromDefault(recipe?.broth.defaultType ?? 'vegetal'),
      thaiLegume: pref?.thaiLegume ?? recipe?.options.thaiLegume?.default ?? 'none',
    };
    if (pref?.boneBrothGramsFor3 !== undefined) options.boneBrothGramsFor3 = pref.boneBrothGramsFor3;
    if (pref?.concentrateGramsFor3 !== undefined) options.concentrateGramsFor3 = pref.concentrateGramsFor3;
    return options;
  };
  return {
    soupPrefs,
    catalog: ingredientById,
    recipes: recipeById,
    templates: templateById,
    dinners: dinnerById,
    swaps,
  };
}
