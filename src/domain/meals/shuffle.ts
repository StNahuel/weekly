export type Combo = { proteinId: string; sideId: string };

export type PickResult =
  | { status: 'ok'; combo: Combo }
  | { status: 'both_locked'; combo: Combo }
  | { status: 'empty'; reason: 'no_proteins' | 'no_sides' | 'no_pairs' };

export type PickInput = {
  proteins: readonly { id: string }[];
  sides: readonly { id: string }[];
  pairs?: readonly Combo[];
  lockedProteinId?: string;
  lockedSideId?: string;
  previous?: Combo;
  rng?: () => number;
};

export function pickCombo({
  proteins,
  sides,
  pairs: allowedPairs,
  lockedProteinId,
  lockedSideId,
  previous,
  rng = Math.random,
}: PickInput): PickResult {
  if (lockedProteinId !== undefined && lockedSideId !== undefined) {
    return { status: 'both_locked', combo: { proteinId: lockedProteinId, sideId: lockedSideId } };
  }
  let pairs: readonly Combo[];
  if (allowedPairs) {
    pairs = allowedPairs.filter(
      (c) =>
        (lockedProteinId === undefined || c.proteinId === lockedProteinId) &&
        (lockedSideId === undefined || c.sideId === lockedSideId),
    );
    if (pairs.length === 0) return { status: 'empty', reason: 'no_pairs' };
  } else {
    const proteinIds = lockedProteinId !== undefined ? [lockedProteinId] : proteins.map((p) => p.id);
    const sideIds = lockedSideId !== undefined ? [lockedSideId] : sides.map((s) => s.id);
    if (proteinIds.length === 0) return { status: 'empty', reason: 'no_proteins' };
    if (sideIds.length === 0) return { status: 'empty', reason: 'no_sides' };
    pairs = proteinIds.flatMap((proteinId) => sideIds.map((sideId) => ({ proteinId, sideId })));
  }
  const isPrevious = (c: Combo) => c.proteinId === previous?.proteinId && c.sideId === previous.sideId;
  const pool = pairs.length > 1 && pairs.some(isPrevious) ? pairs.filter((c) => !isPrevious(c)) : pairs;
  const combo = pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)];
  if (!combo) throw new Error('pickCombo: empty pair pool');
  return { status: 'ok', combo };
}
