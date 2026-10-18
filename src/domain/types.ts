export const DAY_TYPES = ['strength', 'boxing', 'rest', 'busy', 'sick'] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const TEMPLATE_DAYS = [...DAY_TYPES, 'flexible'] as const;
export type TemplateDay = (typeof TEMPLATE_DAYS)[number];

export const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const WEIGHT_BASES = [
  'raw',
  'drained_ready',
  'edible_raw',
  'ready',
  'powder',
  'dry',
  'edible',
  'raw_or_frozen',
  'cooked',
  'frozen_concentrate',
  'frozen_ready',
] as const;
export type WeightBasis = (typeof WEIGHT_BASES)[number];

export const ESTIMATE_QUALITIES = ['generic_estimate', 'requires_label'] as const;
export type EstimateQuality = (typeof ESTIMATE_QUALITIES)[number];

export const BROTH_TYPES = ['vegetable_concentrate', 'bone_ready'] as const;
export type BrothType = (typeof BROTH_TYPES)[number];

export const THAI_LEGUMES = ['none', 'chickpeas', 'edamame'] as const;
export type ThaiLegume = (typeof THAI_LEGUMES)[number];

export const SOCIAL_KINDS = ['friends', 'family'] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];

export const STORE_CATEGORIES = [
  'Verdulería',
  'Carnicería',
  'Pescadería',
  'Lácteos y huevos',
  'Panadería',
  'Almacén',
  'Congelados',
  'Condimentos',
  'Bebidas',
  'Suplementos',
  'Líquidos',
] as const;
export type StoreCategory = (typeof STORE_CATEGORIES)[number];

export type GramLine = { ingredientId: string; grams: number };

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
