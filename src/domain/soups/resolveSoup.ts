import type { Addition, Recipe, Step } from '../schemas/soups.schema';
import { roundGrams } from './roundGrams';
import type {
  AdditionRole,
  IngredientCatalog,
  LiquidBreakdown,
  ResolvedAddition,
  ResolvedSoup,
  ResolvedStep,
  SelectedLegume,
  SoupOptions,
} from './types';

export const WATER_ID = 'water';
export const VEGETABLE_CONCENTRATE_ID = 'fondo_veg_concentrate';
export const BONE_BROTH_ID = 'fondo_bone_ready';
export const CAPACITY_WARNING_GRAMS = 1650;

const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
// Every resolved gram is a multiple of 0.1, so sums only need float noise removed.
const roundTenth = (x: number) => Math.round(x * 10) / 10;

function resolveLiquids(recipe: Recipe, options: SoupOptions, factor: number): LiquidBreakdown {
  const brothLiquid = roundGrams(recipe.broth.baseBrothComponentGramsFor3 * factor);
  const coconut = recipe.coconut.fixed ? roundGrams(recipe.coconut.gramsFor3 * factor) : 0;
  const { brothType } = options;
  if (brothType === 'vegetable_concentrate') {
    const concentrate =
      options.concentrateGramsFor3 === undefined
        ? roundGrams(brothLiquid * recipe.broth.vegetableConcentrateGramsPerGramOfWater)
        : roundGrams(clamp(options.concentrateGramsFor3, 0.1, 100) * factor);
    return { brothLiquid, water: brothLiquid, concentrate, boneBroth: 0, coconut, brothType };
  }
  const bone3 = options.boneBrothGramsFor3 ?? recipe.broth.defaultBoneBrothGramsFor3;
  const boneBroth = clamp(roundGrams(bone3 * factor), 0, brothLiquid);
  const water = roundGrams(brothLiquid - boneBroth);
  return { brothLiquid, water, concentrate: 0, boneBroth, coconut, brothType };
}

function resolveSteps(
  recipe: Recipe,
  factor: number,
  liquids: LiquidBreakdown,
  legume: SelectedLegume | null,
  catalog: IngredientCatalog,
): ResolvedStep[] {
  const line = (ingredientId: string, grams: number, role: AdditionRole): ResolvedAddition => {
    const ingredient = catalog.get(ingredientId);
    if (!ingredient) throw new Error(`Soup ${recipe.id} references unknown ingredient "${ingredientId}"`);
    const { name, weightBasis, category } = ingredient;
    return { ingredientId, name, grams, weightBasis, category, role };
  };

  const resolveAddition = (addition: Addition): ResolvedAddition[] => {
    switch (addition.kind) {
      case 'ingredient':
        return [line(addition.ingredientId, roundGrams(addition.gramsForBaseServings * factor), 'ingredient')];
      case 'computed_broth':
        return liquids.brothType === 'vegetable_concentrate'
          ? [
              line(WATER_ID, liquids.water, 'water'),
              line(VEGETABLE_CONCENTRATE_ID, liquids.concentrate, 'concentrate'),
            ]
          : [line(BONE_BROTH_ID, liquids.boneBroth, 'bone_broth'), line(WATER_ID, liquids.water, 'water')];
      case 'coconut':
        return [line(addition.ingredientId, liquids.coconut, 'coconut')];
      case 'selected_thai_legume':
        if (legume === null) return [];
        return [
          line(
            addition.variantIngredientIds[legume],
            roundGrams(addition.gramsForBaseServings * factor),
            'legume',
          ),
        ];
    }
  };

  const resolveStep = (step: Step): ResolvedStep => {
    const legumeControls = legume === null ? undefined : step.controlsByLegume?.[legume];
    const hasLegume = step.additions.some((a) => a.kind === 'selected_thai_legume');
    return {
      step: step.step,
      title: step.title,
      instructions: step.instructions,
      sourceSettingsText: step.sourceSettingsText,
      controls: legumeControls ? { ...step.controls, ...legumeControls } : step.controls,
      additions: step.additions.flatMap(resolveAddition).filter((a) => a.grams > 0),
      safetyNotes: step.safetyNotes,
      ...(legume !== null && hasLegume ? { legumeVariant: legume } : {}),
    };
  };

  return recipe.steps.filter((step) => !step.condition || legume !== null).map(resolveStep);
}

function sumByIngredient(additions: ResolvedAddition[]): ResolvedAddition[] {
  const totals = new Map<string, ResolvedAddition>();
  for (const addition of additions) {
    const previous = totals.get(addition.ingredientId);
    totals.set(
      addition.ingredientId,
      previous ? { ...previous, grams: roundTenth(previous.grams + addition.grams) } : addition,
    );
  }
  return [...totals.values()];
}

export function resolveSoup(recipe: Recipe, options: SoupOptions, catalog: IngredientCatalog): ResolvedSoup {
  const { servings } = options;
  if (servings < recipe.minServings || servings > recipe.maxServings) {
    throw new Error(
      `Soup ${recipe.id} supports ${recipe.minServings}–${recipe.maxServings} servings, got ${servings}`,
    );
  }
  const factor = servings / recipe.baseServings;
  const liquids = resolveLiquids(recipe, options, factor);
  const legume = options.thaiLegume === 'none' ? null : options.thaiLegume;
  const steps = resolveSteps(recipe, factor, liquids, legume, catalog);
  const totals = sumByIngredient(steps.flatMap((s) => s.additions));
  const totalGrams = roundTenth(totals.reduce((sum, a) => sum + a.grams, 0));
  return {
    recipeId: recipe.id,
    title: recipe.title,
    servings,
    factor,
    steps,
    totals,
    liquids,
    shopping: totals.filter((a) => a.ingredientId !== WATER_ID),
    totalGrams,
    capacityWarning: totalGrams >= CAPACITY_WARNING_GRAMS,
  };
}
