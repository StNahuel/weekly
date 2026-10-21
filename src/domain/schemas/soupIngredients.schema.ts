import { z } from 'zod';
import { ingredientSchema } from './foods.schema';

export const soupIngredientsSchema = z
  .object({
    schemaVersion: z.literal(1),
    locale: z.literal('es-UY'),
    description: z.string(),
    ingredients: z.array(ingredientSchema),
  })
  .strict();

export type SoupIngredients = z.infer<typeof soupIngredientsSchema>;
