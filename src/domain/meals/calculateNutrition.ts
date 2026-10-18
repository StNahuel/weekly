import type { IngredientCatalog } from '../soups/types';
import type { WeightBasis } from '../types';

export type NutritionLine = { ingredientId: string; grams: number; weightBasis?: WeightBasis };

export type MissingReason = 'requires_label' | 'basis_mismatch' | 'unknown_ingredient';

export type MissingNutrition = { ingredientId: string; name: string; reason: MissingReason };

export type NutritionEstimate = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  complete: boolean;
  missing: MissingNutrition[];
};

export function calculateNutrition(lines: readonly NutritionLine[], catalog: IngredientCatalog): NutritionEstimate {
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const missing: MissingNutrition[] = [];
  for (const line of lines) {
    const ingredient = catalog.get(line.ingredientId);
    if (!ingredient) {
      missing.push({ ingredientId: line.ingredientId, name: line.ingredientId, reason: 'unknown_ingredient' });
      continue;
    }
    const { name, macrosPer100g: macros } = ingredient;
    if (macros === null || ingredient.estimateQuality === 'requires_label') {
      missing.push({ ingredientId: line.ingredientId, name, reason: 'requires_label' });
      continue;
    }
    if (line.weightBasis !== undefined && line.weightBasis !== ingredient.weightBasis) {
      missing.push({ ingredientId: line.ingredientId, name, reason: 'basis_mismatch' });
      continue;
    }
    const factor = line.grams / 100;
    sum.kcal += macros.kcal * factor;
    sum.protein += macros.protein * factor;
    sum.carbs += macros.carbs * factor;
    sum.fat += macros.fat * factor;
  }
  return {
    kcal: Math.round(sum.kcal),
    protein: Math.round(sum.protein),
    carbs: Math.round(sum.carbs),
    fat: Math.round(sum.fat),
    complete: missing.length === 0,
    missing,
  };
}
