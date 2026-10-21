import { z } from 'zod';
import { ESTIMATE_QUALITIES, INGREDIENT_CATEGORIES, WEIGHT_BASES } from '../types';

export const ingredientCategorySchema = z.enum(INGREDIENT_CATEGORIES);

export const macrosSchema = z
  .object({
    kcal: z.number().nonnegative(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
    fiber: z.number().nonnegative().exactOptional(),
    saturatedFat: z.number().nonnegative().exactOptional(),
    sodiumMg: z.number().nonnegative().exactOptional(),
  })
  .strict();

export const ingredientSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: ingredientCategorySchema,
    weightBasis: z.enum(WEIGHT_BASES),
    macrosPer100g: macrosSchema.nullable(),
    estimateQuality: z.enum(ESTIMATE_QUALITIES),
    notes: z.string(),
    allergens: z.array(z.string()),
  })
  .strict();

export const gramLineSchema = z
  .object({
    ingredientId: z.string().min(1),
    grams: z.number().positive(),
  })
  .strict();

const templateFields = {
  id: z.string().min(1),
  title: z.string().min(1),
  ingredients: z.array(gramLineSchema),
  prepMinutes: z.number().int().positive(),
  instructions: z.string(),
  tags: z.array(z.string()),
};

export const templateSchema = z
  .object({ ...templateFields, mealType: z.enum(['breakfast', 'lunch', 'snack']) })
  .strict();

const templateListSchema = <M extends 'breakfast' | 'lunch' | 'snack'>(mealType: M) =>
  z.array(z.object({ ...templateFields, mealType: z.literal(mealType) }).strict());

export const dinnerPresetSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    mealType: z.literal('dinner'),
    proteinIngredients: z.array(gramLineSchema).min(1),
    soupRecipeId: z.string().min(1),
    soupServings: z.literal(1),
    swapSoupAllowed: z.boolean(),
    prepMinutesExcludingSoup: z.number().int().positive(),
    instructions: z.string(),
  })
  .strict();

const idListSchema = z.array(z.string().min(1)).min(1);

export const swapsSchema = z
  .object({
    lunchCarbs: idListSchema,
    proteins: idListSchema,
    vegetables: idListSchema,
    soupReferenceFile: z.string(),
  })
  .strict();

const range = z.tuple([z.number().nonnegative(), z.number().nonnegative()]);

export const foodsSchema = z
  .object({
    schemaVersion: z.literal(2),
    locale: z.literal('es-UY'),
    purpose: z.string(),
    nutritionTargets: z
      .object({ energyKcalRange: range, proteinGRange: range, notes: z.string() })
      .strict(),
    ingredients: z.array(ingredientSchema),
    breakfasts: templateListSchema('breakfast'),
    lunches: templateListSchema('lunch'),
    snacks: templateListSchema('snack'),
    dinners: z.array(dinnerPresetSchema),
    swaps: swapsSchema,
    dataNotes: z.array(z.string()),
  })
  .strict();

export type Foods = z.infer<typeof foodsSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Macros = z.infer<typeof macrosSchema>;
export type Template = z.infer<typeof templateSchema>;
export type DinnerPreset = z.infer<typeof dinnerPresetSchema>;
export type Swaps = z.infer<typeof swapsSchema>;
