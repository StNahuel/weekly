import { EMPTY_FLAGS, type DayRecord, type MealSlot } from '../domain/day/slots';
import type { Seeds } from '../seed';
import type { V1DayRecord, V1MealSlot, V1ProfileRecord } from './exportV1';
import type { ProfileRecord } from './types';

export type V1Lookup = {
  templateIds: ReadonlySet<string>;
  recipeIds: ReadonlySet<string>;
  ingredientIds: ReadonlySet<string>;
  dinnerGramsByProtein: ReadonlyMap<string, number>;
  targetKcal: number;
};

const V1_PROTEIN_IDS: Readonly<Record<string, string>> = {
  chicken: 'chicken_breast',
  beef: 'lean_beef',
  salmon: 'salmon',
  shrimp: 'shrimp',
};

const SOUP_SIDE_PREFIX = 'soup_';
const V1_SLOT_KINDS = new Set(['template', 'combo', 'soup', 'social', 'free', 'skip', 'empty']);

export function v1LookupFromSeeds({ foods, soupIngredients, soups, defaults }: Seeds): V1Lookup {
  const dinnerGramsByProtein = new Map<string, number>();
  for (const dinner of foods.dinners) {
    const [protein] = dinner.proteinIngredients;
    if (protein && !dinnerGramsByProtein.has(protein.ingredientId)) {
      dinnerGramsByProtein.set(protein.ingredientId, protein.grams);
    }
  }
  return {
    templateIds: new Set([...foods.breakfasts, ...foods.lunches, ...foods.snacks].map((t) => t.id)),
    recipeIds: new Set(soups.recipes.map((r) => r.id)),
    ingredientIds: new Set([...foods.ingredients, ...soupIngredients.ingredients].map((i) => i.id)),
    dinnerGramsByProtein,
    targetKcal: defaults.nutrition.dailyCalorieTargetKcal,
  };
}

export function isV1Slot(value: unknown): value is V1MealSlot {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    typeof value.kind === 'string' &&
    V1_SLOT_KINDS.has(value.kind)
  );
}

function migrateCombo(proteinId: string, sideId: string, lookup: V1Lookup): MealSlot {
  const v2ProteinId = V1_PROTEIN_IDS[proteinId];
  const recipeId = sideId.startsWith(SOUP_SIDE_PREFIX) ? sideId.slice(SOUP_SIDE_PREFIX.length) : undefined;
  const grams = v2ProteinId === undefined ? undefined : lookup.dinnerGramsByProtein.get(v2ProteinId);
  if (v2ProteinId === undefined || grams === undefined || recipeId === undefined || !lookup.recipeIds.has(recipeId)) {
    return { kind: 'empty', note: `v1:combo:${proteinId}+${sideId}` };
  }
  return { kind: 'dinner', proteinId: v2ProteinId, proteinGrams: grams, soupRecipeId: recipeId, soupServings: 1 };
}

export function migrateSlotV1(slot: V1MealSlot, lookup: V1Lookup): MealSlot {
  switch (slot.kind) {
    case 'template':
      return lookup.templateIds.has(slot.templateId)
        ? { kind: 'template', templateId: slot.templateId }
        : { kind: 'empty', note: `v1:template:${slot.templateId}` };
    case 'combo':
      return migrateCombo(slot.proteinId, slot.sideId, lookup);
    case 'soup':
      return { kind: 'empty', note: `v1:soup:${slot.soupId}` };
    case 'free':
      return { kind: 'skip' };
    case 'social':
      return { kind: 'social', social: slot.social };
    case 'skip':
      return { kind: 'skip' };
    case 'empty':
      return { kind: 'empty' };
  }
}

export function migrateDayV1(day: V1DayRecord, lookup: V1Lookup): DayRecord {
  return {
    date: day.date,
    dayType: day.dayType,
    flexible: day.flexible,
    slots: {
      breakfast: migrateSlotV1(day.slots.breakfast, lookup),
      lunch: migrateSlotV1(day.slots.lunch, lookup),
      snack: migrateSlotV1(day.slots.snack, lookup),
      dinner: migrateSlotV1(day.slots.dinner, lookup),
    },
    flags: structuredClone(EMPTY_FLAGS),
    confirmedAt: day.confirmedAt,
  };
}

// Dropped V1 ingredient ids would make every later backup fail the unknown-id check.
export function migrateProfileV1(
  profile: V1ProfileRecord,
  seedTargetKcal: number,
  knownIngredientIds: ReadonlySet<string>,
): ProfileRecord {
  const { excludedIngredientIds, notes } = profile.dietary;
  return {
    ...profile,
    nutrition: { ...profile.nutrition, dailyCalorieTargetKcal: seedTargetKcal },
    dietary: { excludedIngredientIds: excludedIngredientIds.filter((id) => knownIngredientIds.has(id)), notes },
  };
}
