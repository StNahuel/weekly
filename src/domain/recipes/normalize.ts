import type { RawCatalogItem, RawPlate, RawRecetario, RawSoupMeal, RawStep, RawStepFixes, RawVariants } from './raw.schema';
import type {
  Addition,
  AdditionPlace,
  Catalog,
  CatalogItem,
  Category,
  Device,
  Plate,
  PlateMethod,
  ProteinOption,
  Recipe,
  ShopSection,
  SoupMeal,
  Step,
} from './types';

// The JSON uses many device names; the app shows four.
const DEVICE_BY_RAW: Readonly<Record<string, Device>> = {
  iChef: 'ichef',
  air_fryer: 'air_fryer',
  hornalla: 'hornalla',
  hornalla_sarten: 'hornalla',
  hornalla_o_pava: 'hornalla',
  'sin cocción': 'sin_coccion',
  bol: 'sin_coccion',
  mesa: 'sin_coccion',
  tabla: 'sin_coccion',
  shaker: 'sin_coccion',
  vaso_jugadora_o_licuadora: 'sin_coccion',
  vaso_o_jarra: 'sin_coccion',
  jarra_o_vaso: 'sin_coccion',
};

const DEVICE_ORDER: readonly Device[] = ['ichef', 'air_fryer', 'hornalla', 'sin_coccion'];

// Equipment summary for cards: serving and mixing steps only count when nothing is cooked.
export function summarizeDevices(steps: readonly Step[]): Device[] {
  const used = new Set(steps.map((s) => s.device));
  const devices = DEVICE_ORDER.filter((d) => used.has(d));
  return devices.length > 1 ? devices.filter((d) => d !== 'sin_coccion') : devices;
}

const SECTION_BY_RAW: Readonly<Record<string, ShopSection | null>> = {
  Verdulería: 'Verdulería',
  Frutería: 'Frutería',
  'Frutas y aromáticos': 'Frutería',
  Carnicería: 'Carnicería',
  Pescadería: 'Pescadería',
  Lácteos: 'Lácteos y huevos',
  'Lácteos y huevos': 'Lácteos y huevos',
  'Lácteos y bebidas': 'Lácteos y huevos',
  Almacén: 'Almacén',
  Condimentos: 'Condimentos',
  Congelados: 'Congelados',
  'Base de caldo': 'Congelados',
  Suplementos: 'Suplementos',
  Líquidos: null,
};

// 31 catalog items only say "Ingrediente"; place them where they are bought.
const SECTION_BY_ID: Readonly<Record<string, ShopSection | null>> = {
  arugula: 'Verdulería',
  ginger: 'Verdulería',
  spring_onion: 'Verdulería',
  shiitake: 'Verdulería',
  eggplant: 'Verdulería',
  kale: 'Verdulería',
  pumpkin: 'Verdulería',
  lemongrass_fresh: 'Verdulería',
  lime_juice: 'Frutería',
  corvina: 'Pescadería',
  yellowfin_tuna: 'Pescadería',
  olives: 'Almacén',
  soy_sauce: 'Almacén',
  oyster_sauce: 'Almacén',
  cornstarch: 'Almacén',
  peanuts: 'Almacén',
  sesame_seeds: 'Almacén',
  chickpeas_cooked: 'Almacén',
  lentils_cooked: 'Almacén',
  tofu_firm: 'Almacén',
  miso_soy: 'Almacén',
  fish_sauce: 'Almacén',
  curry_paste: 'Almacén',
  coconut_milk_culinary: 'Almacén',
  harissa: 'Almacén',
  peas: 'Congelados',
  chili_dry: 'Condimentos',
  cumin: 'Condimentos',
  smoked_paprika: 'Condimentos',
  black_pepper: 'Condimentos',
  cayenne: 'Condimentos',
  ice: null,
};

const ADD_PREFIX = 'Agregar:';

// Steps repeat their additions as "Agregar: Papa 330 g; Romero 3 g; <instrucción>". The grams are
// rendered from the additions (and scaled), so the duplicated text is dropped.
export function cleanInstructions(text: string, additionCount: number): string {
  if (!text.startsWith(ADD_PREFIX) || additionCount === 0) return text.trim();
  const segments = text.slice(ADD_PREFIX.length).trim().split('; ');
  if (segments.length <= additionCount) return text.trim();
  return segments.slice(additionCount).join('; ').trim();
}

function deviceOf(raw: string, where: string): Device {
  const device = DEVICE_BY_RAW[raw];
  if (!device) throw new Error(`Unknown device "${raw}" in ${where}`);
  return device;
}

function sectionOf(item: RawCatalogItem): ShopSection | null {
  if (Object.hasOwn(SECTION_BY_ID, item.id)) return SECTION_BY_ID[item.id] ?? null;
  if (Object.hasOwn(SECTION_BY_RAW, item.category)) return SECTION_BY_RAW[item.category] ?? null;
  throw new Error(`No shop section for ingredient "${item.id}" (category "${item.category}")`);
}

function notesOf(notes: string[] | string | undefined): string[] {
  if (notes === undefined) return [];
  return (typeof notes === 'string' ? [notes] : notes).map((n) => n.trim()).filter(Boolean);
}

function makeStepNormalizer(catalog: Catalog) {
  type RawAddition = {
    ingredientId: string;
    grams: number;
    optional?: boolean | undefined;
    fixed?: boolean | undefined;
    place?: AdditionPlace | undefined;
  };
  const addition = (a: RawAddition, where: string): Addition => {
    const item = catalog.get(a.ingredientId);
    if (!item) throw new Error(`Unknown ingredient "${a.ingredientId}" in ${where}`);
    const out: Addition = { ingredientId: a.ingredientId, name: item.name, grams: a.grams, optional: a.optional === true };
    if (a.fixed) out.fixed = true;
    if (a.place) out.place = a.place;
    return out;
  };

  return (raw: RawStep, where: string): Step => {
    const at = `${where} step ${raw.order ?? raw.title}`;
    const step: Step = {
      title: raw.title,
      device: deviceOf(raw.device, at),
      instructions: cleanInstructions(raw.instructions, raw.additions.length),
      additions: raw.additions.map((a) => addition(a, at)),
      safety: raw.safety ?? [],
    };
    if (raw.minutes !== undefined) step.minutes = raw.minutes;
    if (raw.temperatureC !== undefined) step.temperatureC = raw.temperatureC;
    if (raw.heat !== undefined) step.heat = raw.heat;
    if (raw.verify !== undefined) step.verify = raw.verify;
    if (raw.parallelGroup !== undefined) step.parallelGroup = raw.parallelGroup;
    if (raw.machineSettingsSuggested) {
      step.machine = { ...raw.machineSettingsSuggested };
      if (raw.sourceSettingsText !== undefined) step.machine.sourceSettingsText = raw.sourceSettingsText;
    }
    if (raw.alternativeForBoneBroth) {
      step.boneAlternative = {
        replaces: raw.alternativeForBoneBroth.replaces,
        additions: raw.alternativeForBoneBroth.additions.map((a) => addition(a, `${at} (caldo de huesos)`)),
      };
    }
    return step;
  };
}

const searchable = (...parts: string[]) =>
  parts
    .join(' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es');

export function normalizeSearch(text: string): string {
  return searchable(text);
}

export type NormalizedRecetario = { catalog: Catalog; recipes: Recipe[] };

// Water and ice are never bought and carry no macros, so a variant may weigh different amounts.
const FREE_INGREDIENTS = new Set(['water', 'ice']);

function gramsById(steps: readonly Step[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const step of steps) {
    for (const a of step.additions) {
      if (!FREE_INGREDIENTS.has(a.ingredientId)) out.set(a.ingredientId, Math.round(((out.get(a.ingredientId) ?? 0) + a.grams) * 10) / 10);
    }
  }
  return out;
}

function assertSameIngredients(recipeId: string, original: readonly Step[], variant: readonly Step[]): void {
  const want = gramsById(original);
  const got = gramsById(variant);
  for (const id of new Set([...want.keys(), ...got.keys()])) {
    if (want.get(id) !== got.get(id)) {
      throw new Error(`iChef variant for ${recipeId}: ${id} has ${got.get(id) ?? 0} g, original ${want.get(id) ?? 0} g`);
    }
  }
}

// Returns a copy of the recipe book with reviewed corrections applied to individual steps.
export function applyStepFixes(raw: RawRecetario, fixes: RawStepFixes): RawRecetario {
  const copy = structuredClone(raw);
  const byId = new Map(Object.values(copy.categories).flat().map((r) => [r.id, r]));
  for (const fix of fixes.fixes) {
    const recipe = byId.get(fix.recipeId);
    if (!recipe) throw new Error(`Step fix for unknown recipe "${fix.recipeId}"`);
    let steps: RawStep[] | undefined;
    if (fix.part === 'main') steps = 'embeddedSoup' in recipe ? undefined : recipe.steps;
    else if (fix.part === 'soup') steps = 'embeddedSoup' in recipe ? recipe.embeddedSoup.steps : undefined;
    else if ('proteinOptions' in recipe) steps = recipe.proteinOptions.find((p) => `protein:${p.id}` === fix.part)?.steps;
    const target = steps?.[fix.step - 1];
    if (!steps || !target) throw new Error(`Step fix ${fix.recipeId} ${fix.part} #${String(fix.step)} does not match a step`);
    const set = Object.fromEntries(Object.entries(fix.set).filter(([, value]) => value !== undefined)) as Partial<RawStep>;
    steps[fix.step - 1] = { ...target, ...set };
  }
  return copy;
}

export function normalizeRecetario(raw: RawRecetario, rawVariants: RawVariants): NormalizedRecetario {
  const catalog = new Map<string, CatalogItem>();
  for (const item of raw.ingredientCatalog) {
    if (catalog.has(item.id)) throw new Error(`Duplicate ingredient id "${item.id}"`);
    const entry: CatalogItem = { id: item.id, name: item.name, section: sectionOf(item), macrosPer100g: item.macrosPer100g };
    if (item.weightBasis !== undefined) entry.weightBasis = item.weightBasis;
    catalog.set(item.id, entry);
  }
  const step = makeStepNormalizer(catalog);
  const variantById = new Map(rawVariants.variants.map((v) => [v.recipeId, v]));

  const plate = (r: RawPlate, category: Category): Plate => {
    const steps = r.steps.map((s) => step(s, r.id));
    const original: PlateMethod = { id: 'original', title: 'Receta original', summary: null, minutes: r.totalMinutesApprox, steps };
    const variant = variantById.get(r.id);
    variantById.delete(r.id);
    const methods: PlateMethod[] = [original];
    if (variant) {
      const variantSteps = variant.steps.map((s) => step(s, `${r.id} iChef`));
      assertSameIngredients(r.id, steps, variantSteps);
      methods.unshift({ id: 'ichef', title: variant.title, summary: variant.summary, minutes: variant.minutes, steps: variantSteps });
    }
    return {
      kind: 'plate',
      id: r.id,
      title: r.title,
      category,
      subtype: r.subtype ?? null,
      baseServings: r.servings,
      minutes: r.totalMinutesApprox,
      devices: summarizeDevices(methods[0]?.steps ?? steps),
      notes: notesOf(r.notes),
      steps,
      methods,
      referenceKcal: r.nutrition.kcal,
      searchText: searchable(r.title, ...r.ingredients.map((i) => catalog.get(i.id)?.name ?? i.name)),
    };
  };

  const soupMeal = (r: RawSoupMeal): SoupMeal => {
    const soupRaw = r.embeddedSoup;
    const soupSteps = soupRaw.steps.map((s) => step(s, `${r.id} soup`));
    const proteins: ProteinOption[] = r.proteinOptions.map((p) => ({
      id: p.id,
      title: p.title,
      steps: p.steps.map((s) => step(s, `${r.id} protein ${p.id}`)),
      minutes: p.totalMinutesApproxWithPreparedSoup,
      randomEligible: p.occasion === 'habitual',
    }));
    if (!proteins.some((p) => p.id === r.defaultProteinOptionId)) {
      throw new Error(`${r.id}: default protein "${r.defaultProteinOptionId}" is not an option`);
    }
    return {
      kind: 'soupMeal',
      id: r.id,
      title: soupRaw.title,
      category: 'principales',
      baseServings: r.servings,
      devices: summarizeDevices([...soupSteps, ...proteins.flatMap((p) => p.steps)]),
      notes: notesOf(r.notes),
      minutesWithPreparedSoup: r.totalMinutesApproxWithPreparedSoup,
      minutesMakingSoup: r.totalMinutesApproxMakingSoup,
      defaultProteinId: r.defaultProteinOptionId,
      proteins,
      soup: {
        id: soupRaw.id,
        title: soupRaw.title,
        cuisine: soupRaw.cuisine,
        description: soupRaw.description,
        texture: soupRaw.texture,
        notes: notesOf(soupRaw.notes),
        baseServings: soupRaw.servings,
        scaleServings: soupRaw.scaleServings,
        minutes: soupRaw.minutesApprox,
        defaultBroth: soupRaw.brothChoices.default,
        steps: soupSteps,
      },
      searchText: searchable(r.title, soupRaw.title, soupRaw.cuisine, ...proteins.map((p) => p.title), 'sopa caldo'),
    };
  };

  const { desayunos, principales, meriendas, jugos } = raw.categories;
  const recipes: Recipe[] = [
    ...desayunos.map((r) => plate(r, 'desayunos')),
    ...principales.map((r) => ('embeddedSoup' in r ? soupMeal(r) : plate(r, 'principales'))),
    ...meriendas.map((r) => plate(r, 'meriendas')),
    ...jugos.map((r) => plate(r, 'jugos')),
  ];
  if (variantById.size > 0) throw new Error(`iChef variants for unknown plates: ${[...variantById.keys()].join(', ')}`);
  const ids = new Set<string>();
  for (const recipe of recipes) {
    if (ids.has(recipe.id)) throw new Error(`Duplicate recipe id "${recipe.id}"`);
    ids.add(recipe.id);
  }
  return { catalog, recipes };
}
