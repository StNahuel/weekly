import { describe, expect, test } from 'vitest';
import { pickCombo, type Combo } from '../../domain/meals/shuffle';
import { seededRng } from '../../domain/meals/testHelpers';
import { comboCandidates, firstPair, type ComboCandidates } from './candidates';

const NO_DIET = { excludedIngredientIds: [], excludedTags: [], notes: '' };
const FAVORITES: Combo[] = [
  { proteinId: 'salmon', sideId: 'soup_verde' },
  { proteinId: 'chicken', sideId: 'salad' },
];
const isFavorite = (c: Combo) => FAVORITES.some((f) => f.proteinId === c.proteinId && f.sideId === c.sideId);

function draw(candidates: ComboCandidates, times: number, lockedProteinId?: string): Combo[] {
  const rng = seededRng(7);
  let previous: Combo | undefined;
  const picks: Combo[] = [];
  for (let i = 0; i < times; i++) {
    const result = pickCombo({
      proteins: candidates.proteins,
      sides: candidates.sides,
      rng,
      ...(candidates.pairs ? { pairs: candidates.pairs } : {}),
      ...(previous ? { previous } : {}),
      ...(lockedProteinId ? { lockedProteinId } : {}),
    });
    if (result.status === 'empty') throw new Error(result.reason);
    picks.push(result.combo);
    previous = result.combo;
  }
  return picks;
}

describe('favorites-only candidates', () => {
  test('50 shuffles only ever yield saved favorite pairs', () => {
    const candidates = comboCandidates({ dayType: 'rest', favoritesOnly: true }, NO_DIET, FAVORITES);
    expect(candidates.pairs).toEqual(FAVORITES);
    expect(firstPair(candidates)).toEqual(FAVORITES[0]);
    const picks = draw(candidates, 50);
    expect(picks.every(isFavorite)).toBe(true);
    expect(new Set(picks.map((c) => c.proteinId))).toEqual(new Set(['salmon', 'chicken']));
  });

  test('the cross product of favorite proteins and sides, or no favorites filter, yields other pairs', () => {
    const favoritesOnly = comboCandidates({ dayType: 'rest', favoritesOnly: true }, NO_DIET, FAVORITES);
    const crossProduct = { proteins: favoritesOnly.proteins, sides: favoritesOnly.sides };
    expect(draw(crossProduct, 50).some((c) => !isFavorite(c))).toBe(true);
    const all = comboCandidates({ dayType: 'rest', favoritesOnly: false }, NO_DIET, FAVORITES);
    expect(all.pairs).toBeUndefined();
    expect(draw(all, 50).some((c) => !isFavorite(c))).toBe(true);
  });

  test('a locked protein keeps only its favorite pairs', () => {
    const candidates = comboCandidates({ dayType: 'rest', favoritesOnly: true }, NO_DIET, FAVORITES);
    expect(draw(candidates, 10, 'chicken')).toEqual(Array.from({ length: 10 }, () => FAVORITES[1]));
    expect(pickCombo({ ...candidates, pairs: candidates.pairs ?? [], lockedProteinId: 'tuna' })).toEqual({
      status: 'empty',
      reason: 'no_pairs',
    });
  });

  test('a favorite whose side is filtered out is not offered', () => {
    const busy = comboCandidates({ dayType: 'busy', favoritesOnly: true }, NO_DIET, FAVORITES);
    expect(busy.pairs).toEqual([]);
    expect(firstPair(busy)).toBeNull();
  });
});
