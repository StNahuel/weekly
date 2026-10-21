export function pickDifferent<T>(pool: readonly T[], current: T | undefined, rng: () => number): T | null {
  if (pool.length === 0) return null;
  const others = pool.filter((item) => item !== current);
  const from = others.length > 0 ? others : pool;
  return from[Math.min(from.length - 1, Math.floor(rng() * from.length))] ?? null;
}
