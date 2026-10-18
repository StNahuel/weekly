import type { Protein, Side, Template } from '../schemas/foods.schema';
import type { Recipe } from '../schemas/soups.schema';
import type { SoupServings } from '../soups/types';
import { fitsTime, filterCandidates, rankForDay, type SoupIngredientIds } from '../meals/filters';
import { pickCombo } from '../meals/shuffle';
import type { DayType, MealType, SocialKind } from '../types';

export type MealSlot =
  | { kind: 'template'; templateId: string }
  | { kind: 'combo'; proteinId: string; sideId: string }
  | { kind: 'soup'; soupId: string; servings: SoupServings }
  | { kind: 'social'; social: SocialKind }
  | { kind: 'free' }
  | { kind: 'skip' }
  | { kind: 'empty' };

export type DaySlots = Record<MealType, MealSlot>;

export type DayRecord = {
  date: string;
  dayType: DayType;
  flexible: boolean;
  slots: DaySlots;
  confirmedAt: string;
};

export type SlotCatalogs = {
  proteins: readonly Protein[];
  sides: readonly Side[];
  breakfasts: readonly Template[];
  snacks: readonly Template[];
  recipes: ReadonlyMap<string, Recipe>;
};

export type SlotLookup = {
  proteins: ReadonlyMap<string, Protein>;
  sides: ReadonlyMap<string, Side>;
  templates: ReadonlyMap<string, Template>;
};

export type Suitability = 'ok' | 'slow_for_busy';

export type DietaryExclusions = { excludedIngredientIds: readonly string[]; excludedTags: readonly string[] };

const NO_EXCLUSIONS: DietaryExclusions = { excludedIngredientIds: [], excludedTags: [] };

function suggestTemplate(templates: readonly Template[], dayType: DayType, dietary: DietaryExclusions): MealSlot {
  const [best] = templates
    .filter(
      (t) =>
        fitsTime(t, dayType) &&
        !t.tags.some((tag) => dietary.excludedTags.includes(tag)) &&
        !t.ingredients.some((i) => dietary.excludedIngredientIds.includes(i.ingredientId)),
    )
    .sort(rankForDay(dayType));
  return best ? { kind: 'template', templateId: best.id } : { kind: 'empty' };
}

export function suggestSlots(
  dayType: DayType,
  catalogs: SlotCatalogs,
  rng: () => number = Math.random,
  dietary: DietaryExclusions = NO_EXCLUSIONS,
  soupIngredientIds?: SoupIngredientIds,
): DaySlots {
  const { proteins, sides } = filterCandidates({
    proteins: catalogs.proteins,
    sides: catalogs.sides,
    dayType,
    excludedIngredientIds: dietary.excludedIngredientIds,
    excludedTags: dietary.excludedTags,
    favoritesOnly: false,
    favorites: [],
    recipes: catalogs.recipes,
    ...(soupIngredientIds ? { soupIngredientIds } : {}),
  });
  const lunch = pickCombo({ proteins, sides, rng });
  const lunchSlot: MealSlot = lunch.status === 'empty' ? { kind: 'empty' } : { kind: 'combo', ...lunch.combo };
  const dinner = pickCombo({ proteins, sides, rng, ...(lunch.status === 'empty' ? {} : { previous: lunch.combo }) });
  const dinnerSlot: MealSlot = dinner.status === 'empty' ? { kind: 'empty' } : { kind: 'combo', ...dinner.combo };
  return {
    breakfast: suggestTemplate(catalogs.breakfasts, dayType, dietary),
    lunch: lunchSlot,
    snack: suggestTemplate(catalogs.snacks, dayType, dietary),
    dinner: dinnerSlot,
  };
}

export function slotSuitability(slot: MealSlot, dayType: DayType, lookup: SlotLookup): Suitability {
  const items =
    slot.kind === 'combo'
      ? [lookup.proteins.get(slot.proteinId), lookup.sides.get(slot.sideId)]
      : slot.kind === 'template'
        ? [lookup.templates.get(slot.templateId)]
        : [];
  return items.every((item) => item === undefined || fitsTime(item, dayType)) ? 'ok' : 'slow_for_busy';
}
