import { z } from 'zod';
import { scheduleSchema } from '../domain/schemas/defaults.schema';
import { SOUP_SERVINGS } from '../domain/soups/types';
import { DAY_TYPES, MEAL_TYPES, SOCIAL_KINDS } from '../domain/types';
import { grams, id, isoDate, isoDateTime, range, seedText, soupPrefSchema, text, uniqueBy } from './export';

const profileSchemaV1 = z
  .object({
    id: z.literal('me'),
    schedule: scheduleSchema.extend({ notes: seedText, socialDinnerMode: seedText }).strict(),
    nutrition: z.object({ proteinDailyGramsRange: range, calorieRangeKcal: range, provisional: z.literal(true) }).strict(),
    dietary: z
      .object({ excludedIngredientIds: z.array(id).max(500), excludedTags: z.array(id).max(100), notes: text })
      .strict(),
    device: z.object({ largeText: z.boolean() }).strict(),
    onboardingCompletedAt: isoDateTime.exactOptional(),
    updatedAt: isoDateTime,
  })
  .strict();

const mealSlotSchemaV1 = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('template'), templateId: id }).strict(),
  z.object({ kind: z.literal('combo'), proteinId: id, sideId: id }).strict(),
  z.object({ kind: z.literal('soup'), soupId: id, servings: z.literal(SOUP_SERVINGS) }).strict(),
  z.object({ kind: z.literal('social'), social: z.enum(SOCIAL_KINDS) }).strict(),
  z.object({ kind: z.literal('free') }).strict(),
  z.object({ kind: z.literal('skip') }).strict(),
  z.object({ kind: z.literal('empty') }).strict(),
]);

const daySchemaV1 = z
  .object({
    date: isoDate,
    dayType: z.enum(DAY_TYPES),
    flexible: z.boolean(),
    slots: z
      .object({ breakfast: mealSlotSchemaV1, lunch: mealSlotSchemaV1, snack: mealSlotSchemaV1, dinner: mealSlotSchemaV1 })
      .strict(),
    confirmedAt: isoDateTime,
  })
  .strict();

const favoriteSchemaV1 = z
  .object({
    id,
    proteinId: id,
    sideId: id,
    title: text,
    source: z.enum(['seed', 'user']),
    createdAt: isoDateTime,
  })
  .strict();

const shoppingPlanSchemaV1 = z
  .object({
    id: z.literal('current'),
    startDate: isoDate,
    horizonDays: z.number().int().min(1).max(31),
    meals: z
      .array(z.object({ date: isoDate, mealType: z.enum(MEAL_TYPES), slot: mealSlotSchemaV1 }).strict())
      .max(200),
    checkedKeys: z.array(id).max(500),
    removedKeys: z.array(id).max(500),
    overrides: z.record(id, grams).refine((r) => Object.keys(r).length <= 500, 'Too many overrides'),
    updatedAt: isoDateTime,
  })
  .strict();

export const exportSchemaV1 = z
  .object({
    app: z.literal('weekly'),
    schemaVersion: z.literal(1),
    exportedAt: isoDateTime,
    profile: profileSchemaV1.nullable(),
    days: z.array(daySchemaV1).max(3700).refine(uniqueBy('date'), 'Duplicate date'),
    favorites: z.array(favoriteSchemaV1).max(500).refine(uniqueBy('id'), 'Duplicate id'),
    soupPrefs: z.array(soupPrefSchema).max(50).refine(uniqueBy('recipeId'), 'Duplicate recipeId'),
    shoppingPlans: z.array(shoppingPlanSchemaV1).max(10).refine(uniqueBy('id'), 'Duplicate id'),
  })
  .strict();

export type WeeklyExportV1 = z.infer<typeof exportSchemaV1>;
export type V1MealSlot = z.infer<typeof mealSlotSchemaV1>;
export type V1DayRecord = z.infer<typeof daySchemaV1>;
export type V1ProfileRecord = z.infer<typeof profileSchemaV1>;
