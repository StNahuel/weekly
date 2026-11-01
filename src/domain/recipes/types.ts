export const CATEGORIES = ['desayunos', 'principales', 'meriendas', 'jugos'] as const;
export type Category = (typeof CATEGORIES)[number];

export const DEVICES = ['ichef', 'air_fryer', 'hornalla', 'sin_coccion'] as const;
export type Device = (typeof DEVICES)[number];

export const BROTH_TYPES = ['vegetable_concentrate', 'bone_ready'] as const;
export type BrothType = (typeof BROTH_TYPES)[number];

export const SHOP_SECTIONS = [
  'Verdulería',
  'Frutería',
  'Carnicería',
  'Pescadería',
  'Lácteos y huevos',
  'Almacén',
  'Condimentos',
  'Congelados',
  'Suplementos',
] as const;
export type ShopSection = (typeof SHOP_SECTIONS)[number];

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber?: number | undefined };

export type CatalogItem = {
  id: string;
  name: string;
  // null for water/ice: weighed in steps but never bought.
  section: ShopSection | null;
  weightBasis?: string;
  macrosPer100g: Macros | null;
};

export type Catalog = ReadonlyMap<string, CatalogItem>;

export type AdditionPlace = 'canasta' | 'vaporera';

export type Addition = {
  ingredientId: string;
  name: string;
  grams: number;
  optional: boolean;
  fixed?: boolean;
  place?: AdditionPlace;
};

export type MachineSettings = {
  durationSecondsRange: readonly [number, number] | null;
  temperatureCRange: readonly [number, number] | null;
  speed: { mode: 'numeric' | 'gradual' | 'manual'; value: number | null };
  reverseIfSupported: boolean;
  steam?: boolean | undefined;
  accessories?: string[] | undefined;
  sourceSettingsText?: string;
};

export type Step = {
  title: string;
  device: Device;
  instructions: string;
  additions: Addition[];
  minutes?: number;
  temperatureC?: number;
  heat?: string;
  verify?: string;
  parallelGroup?: string;
  machine?: MachineSettings;
  safety: string[];
  boneAlternative?: { replaces: string[]; additions: Addition[] };
};

type RecipeBase = {
  id: string;
  title: string;
  category: Category;
  baseServings: number;
  devices: Device[];
  notes: string[];
  searchText: string;
};

export type PlateMethodId = 'ichef' | 'original';

export type PlateMethod = { id: PlateMethodId; title: string; summary: string | null; minutes: number; steps: Step[] };

export type Plate = RecipeBase & {
  kind: 'plate';
  subtype: string | null;
  minutes: number;
  // The original steps; every method adds the same ingredients and grams (water aside).
  steps: Step[];
  // "Con iChef" first when the recipe has one, then the original.
  methods: PlateMethod[];
  referenceKcal: number;
};

export type ProteinOption = {
  id: string;
  title: string;
  steps: Step[];
  minutes: number;
  // The JSON marks beef and tuna as occasional; the randomizer skips them.
  randomEligible: boolean;
};

export type Soup = {
  id: string;
  title: string;
  cuisine: string;
  description: string;
  texture: string;
  notes: string[];
  baseServings: number;
  scaleServings: number[];
  minutes: number;
  defaultBroth: BrothType;
  steps: Step[];
};

export type SoupMeal = RecipeBase & {
  kind: 'soupMeal';
  minutesWithPreparedSoup: number;
  minutesMakingSoup: number;
  defaultProteinId: string;
  proteins: ProteinOption[];
  soup: Soup;
};

export type Recipe = Plate | SoupMeal;
