import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { savePlan } from '../../db/repo';
import type { ShoppingPlanRecord } from '../../db/types';
import { suggestSlots, type DaySlots, type DietaryExclusions, type MealSlot } from '../../domain/day/slots';
import { localDateKey, type WeeklyTemplate } from '../../domain/day/today';
import type { SoupIngredientIds } from '../../domain/meals/filters';
import { soupIngredientLookup } from '../../domain/meals/resolveMeal';
import { buildPlanDays, clampHorizon, defaultHorizonDays } from '../../domain/shopping/horizon';
import type { PlannedMeal } from '../../domain/shopping/planLines';
import type { SoupServings } from '../../domain/soups/types';
import { MEAL_TYPES } from '../../domain/types';
import { defaults } from '../../seed/defaults';
import { buildMealContext } from '../shared/mealContext';
import { SLOT_CATALOGS } from '../shared/slotCatalogs';

const NO_EXCLUSIONS: DietaryExclusions = { excludedIngredientIds: [], excludedTags: [] };

export type PlanInputs = { dietary?: DietaryExclusions; template?: WeeklyTemplate; rng?: () => number };

export function usePlan(): ShoppingPlanRecord | null | undefined {
  return useLiveQuery(async () => (await db.shoppingPlans.get('current')) ?? null);
}

type ConfirmedSlots = ReadonlyMap<string, DaySlots>;

function planDates(startDate: string, horizonDays: number): string[] {
  return buildPlanDays(startDate, clampHorizon(horizonDays), defaults.schedule.template).map((day) => day.date);
}

async function confirmedSlots(dates: string[]): Promise<ConfirmedSlots> {
  const days = await db.days.bulkGet(dates);
  return new Map(days.flatMap((day) => (day ? [[day.date, day.slots] as const] : [])));
}

async function soupIngredientIds(): Promise<SoupIngredientIds> {
  return soupIngredientLookup(buildMealContext(await db.soupPrefs.toArray()));
}

// A day already confirmed in Hoy keeps its chosen meals; only the other days get suggestions.
function buildPlan(
  startDate: string,
  horizonDays: number,
  inputs: PlanInputs,
  confirmed: ConfirmedSlots,
  soupIds: SoupIngredientIds,
): ShoppingPlanRecord {
  const { dietary = NO_EXCLUSIONS, template = defaults.schedule.template, rng = Math.random } = inputs;
  const days = clampHorizon(horizonDays);
  const meals = buildPlanDays(startDate, days, template).flatMap((day) => {
    const slots = confirmed.get(day.date) ?? suggestSlots(day.suggestedDayType, SLOT_CATALOGS, rng, dietary, soupIds);
    return MEAL_TYPES.map((mealType): PlannedMeal => ({ date: day.date, mealType, slot: slots[mealType] }));
  });
  return {
    id: 'current',
    startDate,
    horizonDays: days,
    meals,
    checkedKeys: [],
    removedKeys: [],
    overrides: {},
    updatedAt: new Date().toISOString(),
  };
}

export async function createPlan(startDate: string, horizonDays: number, inputs: PlanInputs = {}): Promise<ShoppingPlanRecord> {
  const [confirmed, soupIds] = await Promise.all([confirmedSlots(planDates(startDate, horizonDays)), soupIngredientIds()]);
  const plan = buildPlan(startDate, horizonDays, inputs, confirmed, soupIds);
  await savePlan(plan);
  return plan;
}

const mealKey = ({ date, mealType }: Pick<PlannedMeal, 'date' | 'mealType'>) => `${date}|${mealType}`;

const EXPLICIT_KINDS: ReadonlySet<MealSlot['kind']> = new Set(['soup', 'social', 'free', 'skip']);

export async function regeneratePlan(
  startDate: string,
  horizonDays: number,
  inputs: PlanInputs = {},
): Promise<ShoppingPlanRecord> {
  const [previous, favorites, confirmed, soupIds] = await Promise.all([
    db.shoppingPlans.get('current'),
    db.favorites.toArray(),
    confirmedSlots(planDates(startDate, horizonDays)),
    soupIngredientIds(),
  ]);
  const isKept = (slot: MealSlot) =>
    EXPLICIT_KINDS.has(slot.kind) ||
    (slot.kind === 'combo' && favorites.some((f) => f.proteinId === slot.proteinId && f.sideId === slot.sideId));
  const previousByKey = new Map<string, PlannedMeal[]>();
  for (const meal of previous?.meals ?? []) previousByKey.set(mealKey(meal), [...(previousByKey.get(mealKey(meal)) ?? []), meal]);

  const fresh = buildPlan(startDate, horizonDays, inputs, confirmed, soupIds);
  const meals = fresh.meals.flatMap((meal) => {
    const [primary, ...extras] = previousByKey.get(mealKey(meal)) ?? [];
    const keepPrimary = primary !== undefined && isKept(primary.slot) && !confirmed.has(meal.date);
    return [{ ...meal, slot: keepPrimary ? primary.slot : meal.slot }, ...extras.filter((extra) => isKept(extra.slot))];
  });
  const plan = { ...fresh, meals };
  await savePlan(plan);
  return plan;
}

export async function addSoupToPlan(recipeId: string, servings: SoupServings, now: Date = new Date()): Promise<void> {
  const slot: MealSlot = { kind: 'soup', soupId: recipeId, servings };
  await db.transaction('rw', [db.shoppingPlans, db.profile, db.days, db.soupPrefs], async () => {
    let plan = await db.shoppingPlans.get('current');
    if (!plan) {
      const profile = await db.profile.get('me');
      const startDate = localDateKey(now, defaults.timezone);
      plan = buildPlan(
        startDate,
        defaultHorizonDays,
        { ...(profile ? { dietary: profile.dietary, template: profile.schedule.template } : {}) },
        await confirmedSlots(planDates(startDate, defaultHorizonDays)),
        await soupIngredientIds(),
      );
    }
    const free = plan.meals.findIndex((m) => m.mealType === 'dinner' && m.slot.kind === 'empty');
    const lastDate = plan.meals.reduce((last, m) => (m.date > last ? m.date : last), plan.startDate);
    const meals: PlannedMeal[] =
      free === -1
        ? [...plan.meals, { date: lastDate, mealType: 'dinner', slot }]
        : plan.meals.map((meal, i) => (i === free ? { ...meal, slot } : meal));
    await db.shoppingPlans.put({ ...plan, meals, updatedAt: new Date().toISOString() });
  });
}
