import type { Ingredient } from '../schemas/foods.schema';
import type { Controls } from '../schemas/soups.schema';
import type { BrothType, StoreCategory, ThaiLegume, WeightBasis } from '../types';

export const SOUP_SERVINGS = [1, 2, 3, 4] as const;
export type SoupServings = (typeof SOUP_SERVINGS)[number];

export type SelectedLegume = Exclude<ThaiLegume, 'none'>;

export type IngredientCatalog = ReadonlyMap<string, Ingredient>;

export type SoupOptions = {
  servings: SoupServings;
  brothType: BrothType;
  boneBrothGramsFor3?: number;
  concentrateGramsFor3?: number;
  thaiLegume: ThaiLegume;
};

export type AdditionRole = 'ingredient' | 'water' | 'concentrate' | 'bone_broth' | 'coconut' | 'legume';

export type ResolvedAddition = {
  ingredientId: string;
  name: string;
  grams: number;
  weightBasis: WeightBasis;
  category: StoreCategory;
  role: AdditionRole;
};

export type ResolvedStep = {
  step: number;
  title: string;
  instructions: string;
  sourceSettingsText: string;
  controls: Controls;
  additions: ResolvedAddition[];
  safetyNotes: string[];
  legumeVariant?: SelectedLegume;
};

export type LiquidBreakdown = {
  brothLiquid: number;
  water: number;
  concentrate: number;
  boneBroth: number;
  coconut: number;
  brothType: BrothType;
};

export type ResolvedSoup = {
  recipeId: string;
  title: string;
  servings: SoupServings;
  factor: number;
  steps: ResolvedStep[];
  totals: ResolvedAddition[];
  liquids: LiquidBreakdown;
  shopping: ResolvedAddition[];
  totalGrams: number;
  capacityWarning: boolean;
};
