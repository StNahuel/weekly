import type { RawCatalogItem, RawPlate, RawRecetario, RawSoupMeal, RawStep } from './raw.schema';
import type {
  Addition,
  Catalog,
  CatalogItem,
  Category,
  Device,
  Plate,
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
  const addition = (a: { ingredientId: string; grams: number; optional?: boolean | undefined }, where: string): Addition => {
    const item = catalog.get(a.ingredientId);
    if (!item) throw new Error(`Unknown ingredient "${a.ingredientId}" in ${where}`);
    return { ingredientId: a.ingredientId, name: item.name, grams: a.grams, optional: a.optional === true };
  };

  return (raw: RawStep, where: string): Step => {
    const at = `${where} step ${raw.order}`;
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

export function normalizeRecetario(raw: RawRecetario): NormalizedRecetario {
  const catalog = new Map<string, CatalogItem>();
  for (const item of raw.ingredientCatalog) {
    if (catalog.has(item.id)) throw new Error(`Duplicate ingredient id "${item.id}"`);
    const entry: CatalogItem = { id: item.id, name: item.name, section: sectionOf(item), macrosPer100g: item.macrosPer100g };
    if (item.weightBasis !== undefined) entry.weightBasis = item.weightBasis;
    catalog.set(item.id, entry);
  }
  const step = makeStepNormalizer(catalog);

  const plate = (r: RawPlate, category: Category): Plate => {
    const steps = r.steps.map((s) => step(s, r.id));
    return {
      kind: 'plate',
      id: r.id,
      title: r.title,
      category,
      subtype: r.subtype ?? null,
      baseServings: r.servings,
      minutes: r.totalMinutesApprox,
      devices: summarizeDevices(steps),
      notes: notesOf(r.notes),
      steps,
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
  const ids = new Set<string>();
  for (const recipe of recipes) {
    if (ids.has(recipe.id)) throw new Error(`Duplicate recipe id "${recipe.id}"`);
    ids.add(recipe.id);
  }
  return { catalog, recipes };
}
