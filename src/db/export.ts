import { z } from 'zod';
import { localDateKey } from '../domain/day/today';
import { scheduleSchema } from '../domain/schemas/defaults.schema';
import { SOUP_SERVINGS } from '../domain/soups/types';
import { BROTH_TYPES, DAY_TYPES, MEAL_TYPES, SOCIAL_KINDS, THAI_LEGUMES } from '../domain/types';
import type { WeeklyDB } from './index';

export const EXPORT_SCHEMA_VERSION = 1;

const id = z.string().min(1).max(200);
const text = z.string().max(200);
const seedText = z.string().max(1000);
const grams = z.number().nonnegative();
const range = z.tuple([grams, grams]);
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime();

function uniqueBy<K extends string>(key: K) {
  return (items: Record<K, string>[]) => new Set(items.map((item) => item[key])).size === items.length;
}

const profileSchema = z
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

export const mealSlotSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('template'), templateId: id }).strict(),
  z.object({ kind: z.literal('combo'), proteinId: id, sideId: id }).strict(),
  z.object({ kind: z.literal('soup'), soupId: id, servings: z.literal(SOUP_SERVINGS) }).strict(),
  z.object({ kind: z.literal('social'), social: z.enum(SOCIAL_KINDS) }).strict(),
  z.object({ kind: z.literal('free') }).strict(),
  z.object({ kind: z.literal('skip') }).strict(),
  z.object({ kind: z.literal('empty') }).strict(),
]);

const daySchema = z
  .object({
    date: isoDate,
    dayType: z.enum(DAY_TYPES),
    flexible: z.boolean(),
    slots: z
      .object({ breakfast: mealSlotSchema, lunch: mealSlotSchema, snack: mealSlotSchema, dinner: mealSlotSchema })
      .strict(),
    confirmedAt: isoDateTime,
  })
  .strict();

const favoriteSchema = z
  .object({
    id,
    proteinId: id,
    sideId: id,
    title: text,
    source: z.enum(['seed', 'user']),
    createdAt: isoDateTime,
  })
  .strict();

const soupPrefSchema = z
  .object({
    recipeId: id,
    brothType: z.enum(BROTH_TYPES),
    boneBrothGramsFor3: grams.exactOptional(),
    concentrateGramsFor3: grams.exactOptional(),
    thaiLegume: z.enum(THAI_LEGUMES),
  })
  .strict();

const shoppingPlanSchema = z
  .object({
    id: z.literal('current'),
    startDate: isoDate,
    horizonDays: z.number().int().min(1).max(31),
    meals: z
      .array(z.object({ date: isoDate, mealType: z.enum(MEAL_TYPES), slot: mealSlotSchema }).strict())
      .max(200),
    checkedKeys: z.array(id).max(500),
    removedKeys: z.array(id).max(500),
    overrides: z.record(id, grams).refine((r) => Object.keys(r).length <= 500, 'Too many overrides'),
    updatedAt: isoDateTime,
  })
  .strict();

export const exportSchema = z
  .object({
    app: z.literal('weekly'),
    schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
    exportedAt: isoDateTime,
    profile: profileSchema.nullable(),
    days: z.array(daySchema).max(3700).refine(uniqueBy('date'), 'Duplicate date'),
    favorites: z.array(favoriteSchema).max(500).refine(uniqueBy('id'), 'Duplicate id'),
    soupPrefs: z.array(soupPrefSchema).max(50).refine(uniqueBy('recipeId'), 'Duplicate recipeId'),
    shoppingPlans: z.array(shoppingPlanSchema).max(10).refine(uniqueBy('id'), 'Duplicate id'),
  })
  .strict();

export type WeeklyExport = z.infer<typeof exportSchema>;

export async function buildExport(db: WeeklyDB, now: Date = new Date()): Promise<WeeklyExport> {
  const tables = [db.profile, db.days, db.favorites, db.soupPrefs, db.shoppingPlans];
  const [profile, days, favorites, soupPrefs, shoppingPlans] = await db.transaction('r', tables, () =>
    Promise.all([
      db.profile.get('me'),
      db.days.toArray(),
      db.favorites.toArray(),
      db.soupPrefs.toArray(),
      db.shoppingPlans.toArray(),
    ]),
  );
  return exportSchema.parse({
    app: 'weekly',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: profile ?? null,
    days,
    favorites,
    soupPrefs,
    shoppingPlans,
  });
}

export function exportFileName(now: Date = new Date()): string {
  return `weekly-backup-${localDateKey(now)}.json`;
}

export function downloadExport(data: WeeklyExport, now: Date = new Date()): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  // iOS Safari reads the blob after click() returns, so revoking synchronously can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
