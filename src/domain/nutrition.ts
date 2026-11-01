import type { Catalog } from './recipes/types';

export type NutritionLine = { ingredientId: string; grams: number };

export type NutritionEstimate = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  complete: boolean;
  missing: string[];
};

const oneDecimal = (x: number) => Math.round(x * 10) / 10;

// Unknown macros (FONDO, broth) are listed as missing, never counted as zero.
export function calculateNutrition(lines: readonly NutritionLine[], catalog: Catalog): NutritionEstimate {
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const missing = new Set<string>();
  for (const line of lines) {
    const item = catalog.get(line.ingredientId);
    if (!item?.macrosPer100g) {
      missing.add(item?.name ?? line.ingredientId);
      continue;
    }
    const factor = line.grams / 100;
    sum.kcal += item.macrosPer100g.kcal * factor;
    sum.protein += item.macrosPer100g.protein * factor;
    sum.carbs += item.macrosPer100g.carbs * factor;
    sum.fat += item.macrosPer100g.fat * factor;
  }
  return {
    kcal: Math.round(sum.kcal),
    protein: oneDecimal(sum.protein),
    carbs: oneDecimal(sum.carbs),
    fat: oneDecimal(sum.fat),
    complete: missing.size === 0,
    missing: [...missing],
  };
}
