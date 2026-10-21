import { z } from 'zod';
import { BROTH_TYPES, THAI_LEGUMES } from '../types';
import { ingredientCategorySchema } from './foods.schema';

const range = z.tuple([z.number().nonnegative(), z.number().nonnegative()]);

export const speedSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('numeric'), value: z.number().positive(), maxValue: z.null() }).strict(),
  z.object({ mode: z.literal('gradual'), value: z.null(), maxValue: z.number().positive() }).strict(),
  z.object({ mode: z.literal('manual'), value: z.null() }).strict(),
]);

export const controlsSchema = z
  .object({
    durationSecondsRange: range.nullable(),
    temperatureCRange: range.nullable(),
    speed: speedSchema,
    reverseIfSupported: z.boolean(),
    heatOff: z.boolean(),
  })
  .strict();

const legumeControlsSchema = z
  .object({ durationSecondsRange: range, temperatureCRange: range })
  .strict();

export const additionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('ingredient'),
      ingredientId: z.string().min(1),
      gramsForBaseServings: z.number().positive(),
    })
    .strict(),
  z.object({ kind: z.literal('computed_broth'), label: z.string().min(1) }).strict(),
  z
    .object({
      kind: z.literal('coconut'),
      ingredientId: z.string().min(1),
      gramsForBaseServings: z.number().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('selected_thai_legume'),
      gramsForBaseServings: z.number().positive(),
      variantIngredientIds: z
        .object({ chickpeas: z.string().min(1), edamame: z.string().min(1) })
        .strict(),
    })
    .strict(),
]);

export const stepSchema = z
  .object({
    step: z.number().int().positive(),
    title: z.string().min(1),
    instructions: z.string().min(1),
    sourceSettingsText: z.string(),
    controls: controlsSchema,
    additions: z.array(additionSchema),
    safetyNotes: z.array(z.string()),
    condition: z.object({ field: z.literal('thaiLegume'), not: z.literal('none') }).strict().optional(),
    controlsByLegume: z
      .object({ chickpeas: legumeControlsSchema, edamame: legumeControlsSchema })
      .strict()
      .optional(),
  })
  .strict();

export const brothSchema = z
  .object({
    baseBrothComponentGramsFor3: z.number().positive(),
    defaultType: z.enum(['vegetal', 'huesos']),
    types: z.array(z.enum(BROTH_TYPES)),
    vegetableConcentrateGramsPerGramOfWater: z.number().positive(),
    referenceVegetableMix: z.string(),
    defaultBoneBrothGramsFor3: z.number().nonnegative(),
    waterAndConcentrateMustBeMeasuredSeparately: z.boolean(),
    boneBrothIsReadyToUse: z.boolean(),
  })
  .strict();

export const coconutSchema = z
  .object({
    ingredientId: z.string().min(1),
    fixed: z.boolean(),
    gramsFor3: z.number().nonnegative(),
    replacesPartOfLiquidRatherThanBeingAddedOnTop: z.boolean(),
  })
  .strict();

export const recipeIngredientSchema = z
  .object({
    id: z.string().min(1),
    legacyId: z.string().min(1),
    name: z.string().min(1),
    gramsForBaseServings: z.number().positive(),
    category: ingredientCategorySchema,
    conditionalSelection: z.string().optional(),
  })
  .strict();

export const thaiLegumeOptionSchema = z
  .object({
    enabled: z.boolean(),
    default: z.enum(THAI_LEGUMES),
    choices: z.array(z.enum(THAI_LEGUMES)),
    gramsFor3IfSelected: z.number().positive(),
  })
  .strict();

export const recipeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    flavor: z.string(),
    tag: z.string(),
    texture: z.string(),
    description: z.string(),
    minutesApprox: z.number().int().positive(),
    notes: z.string(),
    baseServings: z.number().int().positive(),
    minServings: z.number().int().positive(),
    maxServings: z.number().int().positive(),
    broth: brothSchema,
    coconut: coconutSchema,
    ingredients: z.array(recipeIngredientSchema),
    options: z.object({ thaiLegume: thaiLegumeOptionSchema.nullable() }).strict(),
    steps: z.array(stepSchema),
    provenance: z
      .object({
        sourceFile: z.string(),
        sourceId: z.string(),
        adaptations: z.array(z.string()),
        machineSettingsVerified: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const soupsSchema = z
  .object({
    schemaVersion: z.literal(1),
    locale: z.literal('es-UY'),
    description: z.string(),
    servingRules: z
      .object({
        defaultServings: z.number().int().positive(),
        availableServings: z.array(z.number().int().positive()),
        scaleFactorFormula: z.string(),
        rounding: z.string(),
        liquidRules: z.string(),
        maxFill: z.string(),
        stepAdds: z.string(),
      })
      .strict(),
    safety: z
      .object({
        machineModelNotVerified: z.boolean(),
        temperatureSpeedWarnings: z.string(),
        hotBlend: z.string(),
        vapor: z.string(),
      })
      .strict(),
    recipes: z.array(recipeSchema),
  })
  .strict();

export type Soups = z.infer<typeof soupsSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Addition = z.infer<typeof additionSchema>;
export type Controls = z.infer<typeof controlsSchema>;
export type Speed = z.infer<typeof speedSchema>;
