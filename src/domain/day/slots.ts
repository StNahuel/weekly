import type { DinnerPreset, Ingredient, Template } from '../schemas/foods.schema';
import type { Recipe } from '../schemas/soups.schema';
import type { DayType, GramLine, MealType, SocialKind } from '../types';

export type SlotFlags = { eaten: boolean; locked: boolean };

export type TemplateSlot = { kind: 'template'; templateId: string; gramOverrides?: Record<string, number> };
export type LunchSlot = {
  kind: 'lunch';
  presetId: string;
  proteinId: string;
  proteinGrams: number;
  carbId: string;
  carbGrams: number;
  vegetables: GramLine[];
  oilGrams: number;
};
export type DinnerSlot = {
  kind: 'dinner';
  proteinId: string;
  proteinGrams: number;
  soupRecipeId: string;
  soupServings: 1;
};

export type MealSlot =
  | TemplateSlot
  | LunchSlot
  | DinnerSlot
  | { kind: 'social'; social: SocialKind }
  | { kind: 'skip' }
  | { kind: 'empty'; note?: string };

export type DaySlots = Record<MealType, MealSlot>;
export type DayFlags = Record<MealType, SlotFlags>;

const NO_FLAGS: SlotFlags = Object.freeze({ eaten: false, locked: false });

export const EMPTY_FLAGS: Readonly<DayFlags> = Object.freeze({
  breakfast: NO_FLAGS,
  lunch: NO_FLAGS,
  snack: NO_FLAGS,
  dinner: NO_FLAGS,
});

export type DayRecord = {
  date: string;
  dayType: DayType;
  flexible: boolean;
  slots: DaySlots;
  flags: DayFlags;
  confirmedAt: string;
};

export type SlotCatalogs = {
  breakfasts: readonly Template[];
  lunches: readonly Template[];
  snacks: readonly Template[];
  dinners: readonly DinnerPreset[];
  recipes: ReadonlyMap<string, Recipe>;
  catalog: ReadonlyMap<string, Ingredient>;
};

export type SlotLookup = {
  templates: ReadonlyMap<string, Template>;
  dinners: readonly DinnerPreset[];
  recipes: ReadonlyMap<string, Recipe>;
};

export type Suitability = 'ok' | 'slow_for_busy';

export type DietaryExclusions = { excludedIngredientIds: readonly string[] };

const NO_EXCLUSIONS: DietaryExclusions = { excludedIngredientIds: [] };
export const BUSY_MAX_PREP_MINUTES = 15;

const PREFERRED_BREAKFAST = 'whey_oat_milk';
const PREFERRED_LUNCH: Partial<Record<DayType, string>> = { sick: 'chicken_potato' };
const PREFERRED_SNACK: Partial<Record<DayType, string>> = {
  boxing: 'b3st_fruit',
  strength: 'b3st_fruit',
  sick: 'yogurt_small_fruit',
};

function pickTemplate(pool: readonly Template[], preferredId: string | undefined, rng: () => number): MealSlot {
  const chosen = pool.find((t) => t.id === preferredId) ?? pool[Math.floor(rng() * pool.length)];
  return chosen ? { kind: 'template', templateId: chosen.id } : { kind: 'empty' };
}

export function dinnerSlotFromPreset(preset: DinnerPreset): DinnerSlot {
  const [protein] = preset.proteinIngredients;
  if (!protein) throw new Error(`Dinner preset "${preset.id}" has no protein`);
  return {
    kind: 'dinner',
    proteinId: protein.ingredientId,
    proteinGrams: protein.grams,
    soupRecipeId: preset.soupRecipeId,
    soupServings: 1,
  };
}

export function suggestSlots(
  dayType: DayType,
  catalogs: SlotCatalogs,
  rng: () => number = Math.random,
  dietary: DietaryExclusions = NO_EXCLUSIONS,
): DaySlots {
  const excluded = (ids: readonly string[]) => ids.some((id) => dietary.excludedIngredientIds.includes(id));
  const allowed = (templates: readonly Template[]) =>
    templates.filter((t) => !excluded(t.ingredients.map((i) => i.ingredientId)));
  const dinners = catalogs.dinners.filter(
    (d) =>
      !excluded(d.proteinIngredients.map((i) => i.ingredientId)) &&
      !excluded(catalogs.recipes.get(d.soupRecipeId)?.ingredients.map((i) => i.id) ?? []),
  );
  const breakfast = pickTemplate(allowed(catalogs.breakfasts), PREFERRED_BREAKFAST, rng);
  const lunch = pickTemplate(allowed(catalogs.lunches), PREFERRED_LUNCH[dayType], rng);
  const snack = pickTemplate(allowed(catalogs.snacks), PREFERRED_SNACK[dayType], rng);
  const dinner = dinners[Math.floor(rng() * dinners.length)];
  return { breakfast, lunch, snack, dinner: dinner ? dinnerSlotFromPreset(dinner) : { kind: 'empty' } };
}

function prepMinutes(slot: MealSlot, lookup: SlotLookup): number | undefined {
  switch (slot.kind) {
    case 'template':
      return lookup.templates.get(slot.templateId)?.prepMinutes;
    case 'lunch':
      return lookup.templates.get(slot.presetId)?.prepMinutes;
    case 'dinner': {
      const preset = lookup.dinners.find((d) => d.proteinIngredients[0]?.ingredientId === slot.proteinId);
      const recipe = lookup.recipes.get(slot.soupRecipeId);
      return preset && recipe ? preset.prepMinutesExcludingSoup + recipe.minutesApprox : undefined;
    }
    default:
      return undefined;
  }
}

export function slotSuitability(slot: MealSlot, dayType: DayType, lookup: SlotLookup): Suitability {
  if (dayType !== 'busy') return 'ok';
  const minutes = prepMinutes(slot, lookup);
  return minutes !== undefined && minutes > BUSY_MAX_PREP_MINUTES ? 'slow_for_busy' : 'ok';
}
