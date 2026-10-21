import { z } from 'zod';
import { DAY_TYPES, MEAL_TYPES, TEMPLATE_DAYS } from '../types';

export const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM (24 h)');

const range = z.tuple([z.number().nonnegative(), z.number().nonnegative()]);
const templateDay = z.enum(TEMPLATE_DAYS);
const notRecommendedSchema = z
  .object({ status: z.literal('not_recommended_by_app'), note: z.string() })
  .strict();

export const scheduleSchema = z
  .object({
    wakeTime: hhmmSchema,
    sleepTimeTarget: hhmmSchema,
    workStart: hhmmSchema,
    workEnd: hhmmSchema,
    meals: z
      .object({ breakfast: hhmmSchema, lunch: hhmmSchema, snack: hhmmSchema, dinner: hhmmSchema })
      .strict(),
    template: z
      .object({
        monday: templateDay,
        tuesday: templateDay,
        wednesday: templateDay,
        thursday: templateDay,
        friday: templateDay,
        saturday: templateDay,
        sunday: templateDay,
      })
      .strict(),
    preferredExerciseTimes: z.object({ strength: hhmmSchema, boxing: hhmmSchema }).strict(),
    notes: z.string(),
    socialDinnersPerWeek: z
      .object({
        friends: z.number().int().nonnegative(),
        family: z.number().int().nonnegative(),
        datesFlexible: z.boolean(),
        weeklyPlanningOptional: z.boolean(),
      })
      .strict(),
    recoveryDayProtected: z.boolean(),
    socialDinnerMode: z.string(),
  })
  .strict();

export const defaultsSchema = z
  .object({
    schemaVersion: z.literal(2),
    locale: z.literal('es-UY'),
    timezone: z.string().min(1),
    uiLanguage: z.literal('es-UY'),
    onboarding: z.object({ required: z.array(z.string()), copy: z.string() }).strict(),
    schedule: scheduleSchema,
    nutrition: z
      .object({
        objective: z.string(),
        proteinDailyGramsRange: range,
        calorieRangeKcalInitiallySuggested: range,
        calorieGoalIsProvisional: z.boolean(),
        activityEffects: z
          .object({
            strength: z.string(),
            boxing: z.string(),
            rest: z.string(),
            busy: z.string(),
            sick: z.string(),
            social: z.string(),
          })
          .strict(),
        mealTypes: z.array(z.enum(MEAL_TYPES)),
        defaultVisibleNutrition: z.array(z.string()),
        expandedNutrition: z.array(z.string()),
        supplements: z
          .object({
            creatine: z.object({ gramsPerDayRange: range, infoOnly: z.boolean() }).strict(),
            whey: z.object({ use: z.string(), infoOnly: z.boolean() }).strict(),
            magnesium: notRecommendedSchema,
            omega3: notRecommendedSchema,
          })
          .strict(),
        dailyCalorieTargetKcal: z.number().positive(),
        mealStrategy: z.string(),
      })
      .strict(),
    interface: z
      .object({
        dailyActivityPromptOncePerDate: z.boolean(),
        activityChoices: z.array(z.enum(DAY_TYPES)),
        activityCanChangeAnytime: z.boolean(),
        avoidMandatoryLogging: z.boolean(),
        macrosCollapsedDefault: z.boolean(),
        shuffling: z
          .object({
            canLockProtein: z.boolean(),
            canLockSide: z.boolean(),
            supportsFavorites: z.literal(false),
            noFullScreenCalendar: z.boolean(),
          })
          .strict(),
        socialDinnerMode: z.string(),
        topLevelTabs: z.tuple([z.literal('Hoy'), z.literal('Sopas')]),
        settingsAccess: z.string(),
        mealChooser: z.string(),
        rebalancing: z
          .object({
            mode: z.literal('propose_confirm'),
            targetKcal: z.number().positive(),
            allowTargetEdit: z.boolean(),
            toleranceKcal: z.number().nonnegative(),
            primaryAdjustment: z.string(),
            forbid: z.array(z.string()),
            minDailyProteinGrams: z.number().nonnegative(),
          })
          .strict(),
      })
      .strict(),
    shopping: z.object({ enabled: z.literal(false) }).strict(),
    storage: z
      .object({
        offlineFirst: z.boolean(),
        database: z.string(),
        noBackend: z.boolean(),
        jsonExportImport: z.boolean(),
        migrationRequired: z.boolean(),
        noTelemetry: z.boolean(),
        localDeviceOnly: z.boolean(),
      })
      .strict(),
    excludedFeatures: z.array(z.string()),
  })
  .strict();

export type Defaults = z.infer<typeof defaultsSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
