import { z } from 'zod';
import { localDateKey } from '../domain/day/today';
import { scheduleSchema } from '../domain/schemas/defaults.schema';
import { BROTH_TYPES, DAY_TYPES, SOCIAL_KINDS, THAI_LEGUMES } from '../domain/types';
import type { WeeklyDB } from './index';

export const EXPORT_SCHEMA_VERSION = 2;

export const id = z.string().min(1).max(200);
export const text = z.string().max(200);
export const seedText = z.string().max(1000);
export const grams = z.number().nonnegative();
export const range = z.tuple([grams, grams]);
export const isoDate = z.iso.date();
export const isoDateTime = z.iso.datetime();

const slotGrams = z.number().min(0.1).max(5000);
const MAX_SLOT_LINES = 20;

export function uniqueBy<K extends string>(key: K) {
  return (items: Record<K, string>[]) => new Set(items.map((item) => item[key])).size === items.length;
}

const profileSchema = z
  .object({
    id: z.literal('me'),
    schedule: scheduleSchema.extend({ notes: seedText, socialDinnerMode: seedText }).strict(),
    nutrition: z
      .object({
        proteinDailyGramsRange: range,
        calorieRangeKcal: range,
        dailyCalorieTargetKcal: z.number().min(800).max(6000),
        provisional: z.literal(true),
      })
      .strict(),
    dietary: z.object({ excludedIngredientIds: z.array(id).max(500), notes: text }).strict(),
    device: z.object({ largeText: z.boolean() }).strict(),
    onboardingCompletedAt: isoDateTime.exactOptional(),
    updatedAt: isoDateTime,
  })
  .strict();

const gramLineSchema = z.object({ ingredientId: id, grams: slotGrams }).strict();

export const mealSlotSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('template'),
      templateId: id,
      gramOverrides: z
        .record(id, slotGrams)
        .refine((r) => Object.keys(r).length <= MAX_SLOT_LINES, 'Too many overrides')
        .exactOptional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('lunch'),
      presetId: id,
      proteinId: id,
      proteinGrams: slotGrams,
      carbId: id,
      carbGrams: slotGrams,
      vegetables: z.array(gramLineSchema).max(MAX_SLOT_LINES),
      oilGrams: z.number().min(0).max(5000),
    })
    .strict(),
  z
    .object({
      kind: z.literal('dinner'),
      proteinId: id,
      proteinGrams: slotGrams,
      soupRecipeId: id,
      soupServings: z.literal(1),
    })
    .strict(),
  z.object({ kind: z.literal('social'), social: z.enum(SOCIAL_KINDS) }).strict(),
  z.object({ kind: z.literal('skip') }).strict(),
  z.object({ kind: z.literal('empty'), note: text.exactOptional() }).strict(),
]);

const flagsSchema = z.object({ eaten: z.boolean(), locked: z.boolean() }).strict();

const daySchema = z
  .object({
    date: isoDate,
    dayType: z.enum(DAY_TYPES),
    flexible: z.boolean(),
    slots: z
      .object({ breakfast: mealSlotSchema, lunch: mealSlotSchema, snack: mealSlotSchema, dinner: mealSlotSchema })
      .strict(),
    flags: z.object({ breakfast: flagsSchema, lunch: flagsSchema, snack: flagsSchema, dinner: flagsSchema }).strict(),
    confirmedAt: isoDateTime,
  })
  .strict();

export const soupPrefSchema = z
  .object({
    recipeId: id,
    brothType: z.enum(BROTH_TYPES),
    boneBrothGramsFor3: grams.exactOptional(),
    concentrateGramsFor3: grams.exactOptional(),
    thaiLegume: z.enum(THAI_LEGUMES),
  })
  .strict();

export const exportSchema = z
  .object({
    app: z.literal('weekly'),
    schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
    exportedAt: isoDateTime,
    profile: profileSchema.nullable(),
    days: z.array(daySchema).max(3700).refine(uniqueBy('date'), 'Duplicate date'),
    soupPrefs: z.array(soupPrefSchema).max(50).refine(uniqueBy('recipeId'), 'Duplicate recipeId'),
  })
  .strict();

export type WeeklyExport = z.infer<typeof exportSchema>;

export async function buildExport(db: WeeklyDB, now: Date = new Date()): Promise<WeeklyExport> {
  const [profile, days, soupPrefs] = await db.transaction('r', [db.profile, db.days, db.soupPrefs], () =>
    Promise.all([db.profile.get('me'), db.days.toArray(), db.soupPrefs.toArray()]),
  );
  return exportSchema.parse({
    app: 'weekly',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: profile ?? null,
    days,
    soupPrefs,
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
