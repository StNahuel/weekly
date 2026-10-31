import { z } from 'zod';

// Only the fields the app reads; Zod strips the rest of data/recetario.json.

const range = z.tuple([z.number(), z.number()]);

export const rawCatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  weightBasis: z.string().optional(),
  macrosPer100g: z
    .object({ kcal: z.number(), protein: z.number(), carbs: z.number(), fat: z.number(), fiber: z.number().optional() })
    .nullable(),
});

const rawLineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  grams: z.number().nonnegative(),
  optional: z.boolean().optional(),
});

const rawAdditionSchema = z.object({
  ingredientId: z.string().min(1),
  name: z.string().min(1),
  grams: z.number().nonnegative(),
  optional: z.boolean().optional(),
});

export const rawMachineSchema = z.object({
  durationSecondsRange: range.nullable(),
  temperatureCRange: range.nullable(),
  speed: z.object({ mode: z.enum(['numeric', 'gradual', 'manual']), value: z.number().nullable() }),
  reverseIfSupported: z.boolean(),
});

export const rawStepSchema = z.object({
  order: z.number(),
  title: z.string().min(1),
  device: z.string().min(1),
  instructions: z.string(),
  additions: z.array(rawAdditionSchema),
  minutes: z.number().optional(),
  temperatureC: z.number().optional(),
  heat: z.string().optional(),
  verify: z.string().optional(),
  parallelGroup: z.string().optional(),
  machineSettingsSuggested: rawMachineSchema.optional(),
  sourceSettingsText: z.string().optional(),
  safety: z.array(z.string()).optional(),
  alternativeForBoneBroth: z
    .object({ replaces: z.array(z.string()), additions: z.array(rawAdditionSchema), instructions: z.string() })
    .optional(),
});

const notesSchema = z.union([z.array(z.string()), z.string()]).optional();

const rawBaseRecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  servings: z.number().int().positive(),
  steps: z.array(rawStepSchema).min(1),
  equipment: z.array(z.string()),
  notes: notesSchema,
});

export const rawPlateSchema = rawBaseRecipeSchema.extend({
  subtype: z.string().optional(),
  ingredients: z.array(rawLineSchema).min(1),
  totalMinutesApprox: z.number(),
  nutrition: z.object({ kcal: z.number() }),
});

const rawProteinOptionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  ingredients: z.array(rawLineSchema).min(1),
  steps: z.array(rawStepSchema).min(1),
  occasion: z.string(),
  totalMinutesApproxWithPreparedSoup: z.number(),
});

const rawSoupSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  cuisine: z.string(),
  servings: z.number().int().positive(),
  scaleServings: z.array(z.number().int().positive()).min(1),
  texture: z.string(),
  minutesApprox: z.number(),
  description: z.string(),
  notes: notesSchema,
  brothChoices: z.object({ default: z.enum(['vegetable_concentrate', 'bone_ready']) }),
  steps: z.array(rawStepSchema).min(1),
});

export const rawSoupMealSchema = rawBaseRecipeSchema.extend({
  subtype: z.literal('caldo_con_proteina'),
  defaultProteinOptionId: z.string().min(1),
  proteinOptions: z.array(rawProteinOptionSchema).min(1),
  embeddedSoup: rawSoupSchema,
  totalMinutesApproxWithPreparedSoup: z.number(),
  totalMinutesApproxMakingSoup: z.number(),
});

export const rawRecetarioSchema = z.object({
  schemaVersion: z.string(),
  ingredientCatalog: z.array(rawCatalogItemSchema).min(1),
  categories: z.object({
    desayunos: z.array(rawPlateSchema),
    principales: z.array(z.union([rawSoupMealSchema, rawPlateSchema])),
    meriendas: z.array(rawPlateSchema),
    jugos: z.array(rawPlateSchema),
  }),
});

export type RawRecetario = z.infer<typeof rawRecetarioSchema>;
export type RawStep = z.infer<typeof rawStepSchema>;
export type RawPlate = z.infer<typeof rawPlateSchema>;
export type RawSoupMeal = z.infer<typeof rawSoupMealSchema>;
export type RawCatalogItem = z.infer<typeof rawCatalogItemSchema>;
