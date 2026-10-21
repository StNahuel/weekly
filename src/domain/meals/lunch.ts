import type { LunchSlot } from '../day/slots';
import { boundsFor } from '../nutrition/bounds';
import type { Foods, Swaps, Template } from '../schemas/foods.schema';
import type { GramLine } from '../types';
import { pickDifferent } from './pick';

export const OIL_ID = 'olive_oil';

export type LunchPart = 'protein' | 'carb';
export type LunchLocks = Record<LunchPart, boolean>;
export type LunchPools = { proteins: readonly string[]; carbs: readonly string[] };
export type ReferenceFoods = Pick<Foods, 'lunches' | 'dinners'>;

export function composeLunch(
  preset: Template,
  swaps: Pick<Swaps, 'proteins' | 'lunchCarbs' | 'vegetables'>,
  overrides: Readonly<Record<string, number>> = {},
): LunchSlot {
  const proteins: GramLine[] = [];
  const carbs: GramLine[] = [];
  const vegetables: GramLine[] = [];
  let oilGrams = 0;
  for (const line of preset.ingredients) {
    const resolved = { ingredientId: line.ingredientId, grams: overrides[line.ingredientId] ?? line.grams };
    if (swaps.proteins.includes(line.ingredientId)) proteins.push(resolved);
    else if (swaps.lunchCarbs.includes(line.ingredientId)) carbs.push(resolved);
    else if (line.ingredientId === OIL_ID) oilGrams += resolved.grams;
    else if (swaps.vegetables.includes(line.ingredientId)) vegetables.push(resolved);
    else throw new Error(`Lunch preset "${preset.id}" has unclassifiable ingredient "${line.ingredientId}"`);
  }
  const [protein] = proteins;
  const [carb] = carbs;
  if (!protein || proteins.length > 1) throw new Error(`Lunch preset "${preset.id}" must have exactly one protein`);
  if (!carb || carbs.length > 1) throw new Error(`Lunch preset "${preset.id}" must have exactly one carb`);
  return {
    kind: 'lunch',
    presetId: preset.id,
    proteinId: protein.ingredientId,
    proteinGrams: protein.grams,
    carbId: carb.ingredientId,
    carbGrams: carb.grams,
    vegetables,
    oilGrams,
  };
}

export function referenceGrams(ingredientId: string, foods: ReferenceFoods): number {
  const fromLunch = foods.lunches.flatMap((l) => l.ingredients).find((i) => i.ingredientId === ingredientId);
  if (fromLunch) return fromLunch.grams;
  const fromDinner = foods.dinners.flatMap((d) => d.proteinIngredients).find((i) => i.ingredientId === ingredientId);
  if (fromDinner) return fromDinner.grams;
  const bounds = boundsFor(ingredientId);
  if (bounds) return bounds.default;
  throw new Error(`No reference grams for "${ingredientId}"`);
}

function withPart(slot: LunchSlot, part: LunchPart, id: string, foods: ReferenceFoods): LunchSlot {
  if (id === (part === 'protein' ? slot.proteinId : slot.carbId)) return slot;
  const grams = referenceGrams(id, foods);
  return part === 'protein'
    ? { ...slot, proteinId: id, proteinGrams: grams }
    : { ...slot, carbId: id, carbGrams: grams };
}

const PARTS: readonly { part: LunchPart; pool: keyof LunchPools; current: 'proteinId' | 'carbId' }[] = [
  { part: 'protein', pool: 'proteins', current: 'proteinId' },
  { part: 'carb', pool: 'carbs', current: 'carbId' },
];

export function rollLunch(
  current: LunchSlot,
  locks: LunchLocks,
  pools: LunchPools,
  rng: () => number,
  foods: ReferenceFoods,
): { slot: LunchSlot; blocked: LunchPart[] } {
  let slot = current;
  const blocked: LunchPart[] = [];
  for (const { part, pool, current: key } of PARTS) {
    if (locks[part]) continue;
    const next = pickDifferent(pools[pool], current[key], rng);
    if (next === null) blocked.push(part);
    else slot = withPart(slot, part, next, foods);
  }
  return { slot, blocked };
}

export function reconcileLunch(
  current: LunchSlot,
  pools: LunchPools,
  locks: LunchLocks,
  foods: ReferenceFoods,
): { slot: LunchSlot; mismatch: LunchPart[] } {
  let slot = current;
  const mismatch: LunchPart[] = [];
  for (const { part, pool, current: key } of PARTS) {
    if (pools[pool].includes(current[key])) continue;
    const [replacement] = pools[pool];
    if (locks[part] || replacement === undefined) mismatch.push(part);
    else slot = withPart(slot, part, replacement, foods);
  }
  return { slot, mismatch };
}
