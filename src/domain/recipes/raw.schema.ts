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
  name: z.string().min(1).optional(),
  grams: z.number().nonnegative(),
  optional: z.boolean().optional(),
  // Water for the cooking basket or steamer: the same amount for any number of portions.
  fixed: z.boolean().optional(),
  // Where it goes when not straight into the jar.
  place: z.enum(['canasta', 'vaporera']).optional(),
});

export const rawMachineSchema = z.object({
  durationSecondsRange: range.nullable(),
  temperatureCRange: range.nullable(),
  speed: z.object({ mode: z.enum(['numeric', 'gradual', 'manual']), value: z.number().nullable() }),
  reverseIfSupported: z.boolean(),
  // "Cocinar al vapor" mode with the vaporera; temperatureCRange stays null.
  steam: z.boolean().optional(),
  accessories: z.array(z.string().min(1)).optional(),
});

export const rawStepSchema = z.object({
  order: z.number().optional(),
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

// data/ichef-variants.json: alternative "Con iChef" step plans for plates, same ingredients and grams.
export const rawVariantsSchema = z.object({
  schemaVersion: z.literal(1),
  variants: z.array(
    z.object({
      recipeId: z.string().min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
      minutes: z.number().positive(),
      steps: z.array(rawStepSchema).min(1),
    }),
  ),
  skipped: z.array(z.object({ recipeId: z.string().min(1), reason: z.string().min(1) })),
});

export type RawVariants = z.infer<typeof rawVariantsSchema>;

const fixableStepSchema = rawStepSchema
  .omit({ additions: true, order: true, alternativeForBoneBroth: true })
  .partial();

// data/step-fixes.json: corrections to cooking steps of recetario.json found in review. Grams never change here.
export const rawStepFixesSchema = z.object({
  schemaVersion: z.literal(1),
  fixes: z.array(
    z.object({
      recipeId: z.string().min(1),
      part: z.union([z.literal('main'), z.literal('soup'), z.string().regex(/^protein:[a-z_]+$/)]),
      step: z.number().int().positive(),
      set: fixableStepSchema,
      reason: z.string().min(1),
    }),
  ),
});

export type RawStepFixes = z.infer<typeof rawStepFixesSchema>;
export type RawRecetario = z.infer<typeof rawRecetarioSchema>;
export type RawStep = z.infer<typeof rawStepSchema>;
export type RawPlate = z.infer<typeof rawPlateSchema>;
export type RawSoupMeal = z.infer<typeof rawSoupMealSchema>;
export type RawCatalogItem = z.infer<typeof rawCatalogItemSchema>;
