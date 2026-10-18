import type { FavoriteCombo, Protein, Side } from '../schemas/foods.schema';
import type { Recipe } from '../schemas/soups.schema';
import type { DayType } from '../types';

export const BUSY_MAX_PREP_MINUTES = 15;

type Tagged = { tags: readonly string[] };
type Timed = { prepMinutes: number };

export type SoupSide = Extract<Side, { kind: 'soup_ref' }>;
export type SoupIngredientIds = (side: SoupSide) => readonly string[];

export type CandidateFilter = {
  proteins: readonly Protein[];
  sides: readonly Side[];
  dayType: DayType;
  maxPrepMinutes?: number;
  excludedIngredientIds: readonly string[];
  excludedTags: readonly string[];
  favoritesOnly: boolean;
  favorites: readonly Pick<FavoriteCombo, 'proteinId' | 'sideId'>[];
  recipes: ReadonlyMap<string, Recipe>;
  soupIngredientIds?: SoupIngredientIds;
};

export type Candidates = { proteins: Protein[]; sides: Side[] };

const hasAny = (tags: readonly string[], wanted: readonly string[]) => tags.some((t) => wanted.includes(t));

const RANK_SCORES: Record<DayType, (tags: readonly string[]) => number> = {
  strength: (tags) => (hasAny(tags, ['carb_source']) ? 0 : 1),
  boxing: (tags) => (hasAny(tags, ['carb_source', 'quick']) ? 0 : 1),
  sick: (tags) => {
    if (hasAny(tags, ['occasional', 'higher_fat'])) return 2;
    return hasAny(tags, ['soup', 'light', 'quick']) ? 0 : 1;
  },
  rest: () => 0,
  busy: () => 0,
};

export function rankForDay(dayType: DayType): (a: Tagged, b: Tagged) => number {
  const score = RANK_SCORES[dayType];
  return (a, b) => score(a.tags) - score(b.tags);
}

export function fitsTime(item: Timed, dayType: DayType, maxPrepMinutes?: number): boolean {
  if (maxPrepMinutes !== undefined && item.prepMinutes > maxPrepMinutes) return false;
  return dayType !== 'busy' || item.prepMinutes <= BUSY_MAX_PREP_MINUTES;
}

export function filterCandidates(filter: CandidateFilter): Candidates {
  const { dayType, maxPrepMinutes, excludedIngredientIds, excludedTags, recipes } = filter;
  const allowed = (item: Tagged & Timed, ingredientIds: readonly string[]) =>
    fitsTime(item, dayType, maxPrepMinutes) &&
    !hasAny(item.tags, excludedTags) &&
    !hasAny(ingredientIds, excludedIngredientIds);

  const sideIngredientIds = (side: Side): readonly string[] | null => {
    if (side.kind === 'standard') return side.ingredients.map((i) => i.ingredientId);
    const recipe = recipes.get(side.soupId);
    if (!recipe) return null;
    return filter.soupIngredientIds?.(side) ?? recipe.ingredients.map((i) => i.id);
  };

  let proteins = filter.proteins.filter((p) => allowed(p, p.ingredients.map((i) => i.ingredientId)));
  let sides = filter.sides.filter((s) => {
    const ids = sideIngredientIds(s);
    return ids !== null && allowed(s, ids);
  });
  if (filter.favoritesOnly) {
    proteins = proteins.filter((p) => filter.favorites.some((f) => f.proteinId === p.id));
    sides = sides.filter((s) => filter.favorites.some((f) => f.sideId === s.id));
  }
  const rank = rankForDay(dayType);
  return { proteins: proteins.sort(rank), sides: sides.sort(rank) };
}
