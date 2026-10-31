import type { Category, ProteinOption, Recipe } from './types';

// No plate in the JSON is this light; the threshold keeps future light plates in the "Ligero" pool.
export const LIGHT_MAX_KCAL = 450;

export function isLight(recipe: Recipe): boolean {
  return recipe.kind === 'soupMeal' || recipe.referenceKcal <= LIGHT_MAX_KCAL;
}

export function candidates(recipes: readonly Recipe[], category: Category, light: boolean): Recipe[] {
  return recipes.filter((r) => r.category === category && (!light || isLight(r)));
}

const pickFrom = <T>(pool: readonly T[], rng: () => number): T | null =>
  pool.length === 0 ? null : (pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))] ?? null);

// Avoids the most recently seen recipes while the pool has others left.
export function pickRecipe(pool: readonly Recipe[], recentIds: readonly string[], rng: () => number = Math.random): Recipe | null {
  const memory = recentIds.slice(-Math.max(0, pool.length - 1));
  const fresh = pool.filter((r) => !memory.includes(r.id));
  return pickFrom(fresh.length > 0 ? fresh : pool, rng);
}

export function pickProtein(proteins: readonly ProteinOption[], rng: () => number = Math.random): ProteinOption | null {
  const usual = proteins.filter((p) => p.randomEligible);
  return pickFrom(usual.length > 0 ? usual : proteins, rng);
}
