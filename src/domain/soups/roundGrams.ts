export function roundGrams(x: number): number {
  if (x >= 10) return Math.round(x);
  if (x >= 1) return Math.round(x * 2) / 2;
  return Math.round(x * 10) / 10;
}
