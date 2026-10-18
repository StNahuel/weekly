import type { ProfileRecord } from '../../db/types';
import type { FavoriteCombo, Template } from '../../domain/schemas/foods.schema';
import { filterCandidates, fitsTime, type Candidates, type SoupIngredientIds } from '../../domain/meals/filters';
import { pickCombo, type Combo } from '../../domain/meals/shuffle';
import type { DayType } from '../../domain/types';
import { foods } from '../../seed/foods';
import { recipeById } from '../../seed/soups';

export type Dietary = ProfileRecord['dietary'];

export type ComboFilters = { dayType: DayType; maxPrepMinutes?: number; favoritesOnly: boolean };

type FavoritePair = Pick<FavoriteCombo, 'proteinId' | 'sideId'>;

// With favoritesOnly, pairs restricts shuffling to saved favorite pairs instead of their cross product.
export type ComboCandidates = Candidates & { pairs?: Combo[] };

export function comboCandidates(
  filters: ComboFilters,
  dietary: Dietary,
  favorites: readonly FavoritePair[],
  soupIngredientIds?: SoupIngredientIds,
): ComboCandidates {
  const candidates = filterCandidates({
    ...filters,
    proteins: foods.proteins,
    sides: foods.sides,
    excludedIngredientIds: dietary.excludedIngredientIds,
    excludedTags: dietary.excludedTags,
    favorites,
    recipes: recipeById,
    ...(soupIngredientIds ? { soupIngredientIds } : {}),
  });
  if (!filters.favoritesOnly) return candidates;
  const pairs = favorites
    .filter((f) => candidates.proteins.some((p) => p.id === f.proteinId) && candidates.sides.some((s) => s.id === f.sideId))
    .map(({ proteinId, sideId }) => ({ proteinId, sideId }));
  return { ...candidates, pairs };
}

export function templateCandidates(mealType: 'breakfast' | 'snack', dietary: Dietary, dayType?: DayType): Template[] {
  const templates = mealType === 'breakfast' ? foods.breakfasts : foods.snacks;
  return templates.filter(
    (t) =>
      (dayType === undefined || fitsTime(t, dayType)) &&
      !t.tags.some((tag) => dietary.excludedTags.includes(tag)) &&
      !t.ingredients.some((i) => dietary.excludedIngredientIds.includes(i.ingredientId)),
  );
}

export type ComboLocks = Record<'protein' | 'side', boolean>;

export const NO_LOCKS: ComboLocks = { protein: false, side: false };

// A null part has no option left under the filters while the other part is locked.
export type ComboDraft = { proteinId: string | null; sideId: string | null };

export const completePair = ({ proteinId, sideId }: ComboDraft): Combo | null =>
  proteinId !== null && sideId !== null ? { proteinId, sideId } : null;

export function reconcileCombo(current: ComboDraft, candidates: ComboCandidates, locks: ComboLocks): ComboDraft | null {
  const pair = completePair(current);
  const lockedProtein = locks.protein && current.proteinId !== null;
  const lockedSide = locks.side && current.sideId !== null;
  if (lockedProtein && lockedSide) return current;
  const keepProtein = lockedProtein || candidates.proteins.some((p) => p.id === current.proteinId);
  const keepSide = lockedSide || candidates.sides.some((s) => s.id === current.sideId);
  const pairOk =
    !candidates.pairs || candidates.pairs.some((c) => c.proteinId === current.proteinId && c.sideId === current.sideId);
  if (pair && keepProtein && keepSide && pairOk) return current;
  const attempts = [
    [keepProtein, keepSide],
    [lockedProtein, lockedSide],
  ].filter(([protein, side]) => !(protein && side));
  for (const [lockProtein, lockSide] of attempts) {
    const result = pickCombo({
      proteins: candidates.proteins,
      sides: candidates.sides,
      ...(candidates.pairs ? { pairs: candidates.pairs } : {}),
      ...(pair ? { previous: pair } : {}),
      ...(lockProtein && current.proteinId !== null ? { lockedProteinId: current.proteinId } : {}),
      ...(lockSide && current.sideId !== null ? { lockedSideId: current.sideId } : {}),
    });
    if (result.status === 'ok') return result.combo;
  }
  if (lockedProtein) return { proteinId: current.proteinId, sideId: null };
  if (lockedSide) return { proteinId: null, sideId: current.sideId };
  return null;
}

export function firstPair({ proteins: [protein], sides: [side], pairs }: ComboCandidates): Combo | null {
  if (pairs) return pairs[0] ?? null;
  return protein && side ? { proteinId: protein.id, sideId: side.id } : null;
}
