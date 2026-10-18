import { z } from 'zod';
import { ESTIMATE_QUALITIES, STORE_CATEGORIES, WEIGHT_BASES } from '../types';

export const storeCategorySchema = z.enum(STORE_CATEGORIES);

export const macrosSchema = z
  .object({
    kcal: z.number().nonnegative(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  })
  .strict();

export const ingredientSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: storeCategorySchema,
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

const dishFields = {
  id: z.string().min(1),
  title: z.string().min(1),
  ingredients: z.array(gramLineSchema),
  prepMinutes: z.number().int().positive(),
  tags: z.array(z.string()),
  instructions: z.string(),
};

export const proteinSchema = z.object(dishFields).strict();

export const sideSchema = z.discriminatedUnion('kind', [
  z.object({ ...dishFields, kind: z.literal('standard') }).strict(),
  z
    .object({
      ...dishFields,
      kind: z.literal('soup_ref'),
      soupId: z.string().min(1),
      defaultServingsForMeal: z.number().int().positive(),
      ingredients: z.tuple([]),
    })
    .strict(),
]);

export const templateSchema = z
  .object({ ...dishFields, mealType: z.enum(['breakfast', 'snack']) })
  .strict();

export const favoriteComboSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    proteinId: z.string().min(1),
    sideId: z.string().min(1),
    starred: z.boolean(),
    source: z.string(),
  })
  .strict();

export const foodsSchema = z
  .object({
    schemaVersion: z.literal(1),
    locale: z.literal('es-UY'),
    metadata: z
      .object({
        nutritionValuesAreEstimates: z.boolean(),
        macroUnits: z.string(),
        source: z.string(),
        weightWarning: z.string(),
        missingNutrients: z.string(),
        sodium: z.string(),
      })
      .strict(),
    ingredients: z.array(ingredientSchema),
    proteins: z.array(proteinSchema),
    sides: z.array(sideSchema),
    breakfasts: z.array(templateSchema.extend({ mealType: z.literal('breakfast') }).strict()),
    snacks: z.array(templateSchema.extend({ mealType: z.literal('snack') }).strict()),
    favoriteCombos: z.array(favoriteComboSchema),
    selectionRules: z
      .object({
        proteinAndSide: z.string(),
        tagFilters: z.string(),
        avoidRepeat: z.string(),
        mealTypes: z.string(),
        soupReference: z.string(),
        macros: z.string(),
      })
      .strict(),
  })
  .strict();

export type Foods = z.infer<typeof foodsSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Macros = z.infer<typeof macrosSchema>;
export type Protein = z.infer<typeof proteinSchema>;
export type Side = z.infer<typeof sideSchema>;
export type Template = z.infer<typeof templateSchema>;
export type FavoriteCombo = z.infer<typeof favoriteComboSchema>;
