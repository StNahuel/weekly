import { calculateNutrition, type NutritionEstimate } from '../nutrition';
import { roundGrams, roundTenth } from '../roundGrams';
import { summarizeDevices } from './normalize';
import type { Addition, BrothType, Catalog, Device, ProteinOption, Recipe, Soup, SoupMeal, Step } from './types';

export const SERVING_CHOICES = [1, 2, 3, 4] as const;
export const CAPACITY_WARNING_GRAMS = 1650;
export const WATER_ID = 'water';

export type SoupPrefs = { brothType: BrothType; includeOptional: boolean };

export type RecipeOptions = SoupPrefs & { servings: number; proteinId?: string };

export type ResolvedLine = { ingredientId: string; name: string; grams: number };

export type ResolvedStep = Step & { usesBoneBroth: boolean };

export type SectionKind = 'main' | 'soup' | 'protein';

export type Section = { kind: SectionKind; title: string; steps: ResolvedStep[] };

export type ResolvedRecipe = {
  recipe: Recipe;
  title: string;
  servings: number;
  protein: ProteinOption | null;
  devices: Device[];
  sections: Section[];
  totals: ResolvedLine[];
  soupLines: ResolvedLine[];
  otherLines: ResolvedLine[];
  nutritionPerPortion: NutritionEstimate;
  soupTotalGrams: number | null;
  capacityWarning: boolean;
};

const scale = (additions: readonly Addition[], factor: number): Addition[] =>
  additions.map((a) => ({ ...a, grams: roundGrams(a.grams * factor) })).filter((a) => a.grams > 0);

export function sumLines(additions: readonly ResolvedLine[]): ResolvedLine[] {
  const totals = new Map<string, ResolvedLine>();
  for (const a of additions) {
    const previous = totals.get(a.ingredientId);
    totals.set(a.ingredientId, {
      ingredientId: a.ingredientId,
      name: previous?.name ?? a.name,
      grams: roundTenth((previous?.grams ?? 0) + a.grams),
    });
  }
  return [...totals.values()];
}

const linesOf = (sections: readonly Section[]) =>
  sumLines(sections.flatMap((s) => s.steps.flatMap((step) => step.additions)));

export function soupSteps(soup: Soup, servings: number, prefs: SoupPrefs): ResolvedStep[] {
  if (!soup.scaleServings.includes(servings)) {
    throw new Error(`${soup.id} supports ${soup.scaleServings.join(', ')} servings, got ${servings}`);
  }
  const factor = servings / soup.baseServings;
  return soup.steps.flatMap((step): ResolvedStep[] => {
    const alt = prefs.brothType === 'bone_ready' ? step.boneAlternative : undefined;
    const base = alt ? [...step.additions.filter((a) => !alt.replaces.includes(a.ingredientId)), ...alt.additions] : step.additions;
    const kept = prefs.includeOptional ? base : base.filter((a) => !a.optional);
    // A step that only adds an optional ingredient disappears when it is not chosen.
    if (base.length > 0 && kept.length === 0) return [];
    return [{ ...step, additions: scale(kept, factor), usesBoneBroth: alt !== undefined }];
  });
}

export function proteinOf(recipe: SoupMeal, proteinId: string | undefined): ProteinOption {
  const fallback = recipe.proteins.find((p) => p.id === recipe.defaultProteinId) ?? recipe.proteins[0];
  const protein = recipe.proteins.find((p) => p.id === proteinId) ?? fallback;
  if (!protein) throw new Error(`${recipe.id} has no protein options`);
  return protein;
}

export function displayTitle(recipe: Recipe, protein: ProteinOption | null): string {
  return recipe.kind === 'soupMeal' && protein ? `${recipe.soup.title} + ${protein.title}` : recipe.title;
}

export function hasOptionalSoupIngredient(recipe: Recipe): boolean {
  return recipe.kind === 'soupMeal' && recipe.soup.steps.some((s) => s.additions.some((a) => a.optional));
}

export function resolveRecipe(recipe: Recipe, options: RecipeOptions, catalog: Catalog): ResolvedRecipe {
  const { servings } = options;
  let sections: Section[];
  let protein: ProteinOption | null = null;
  let soupLines: ResolvedLine[] = [];
  let otherLines: ResolvedLine[];

  if (recipe.kind === 'plate') {
    const factor = servings / recipe.baseServings;
    sections = [
      {
        kind: 'main',
        title: 'Preparación',
        steps: recipe.steps.map((step) => ({ ...step, additions: scale(step.additions, factor), usesBoneBroth: false })),
      },
    ];
    otherLines = linesOf(sections);
  } else {
    protein = proteinOf(recipe, options.proteinId);
    const soupSection: Section = { kind: 'soup', title: `Sopa ${recipe.soup.title}`, steps: soupSteps(recipe.soup, servings, options) };
    const factor = servings / recipe.baseServings;
    const proteinSection: Section = {
      kind: 'protein',
      title: protein.title,
      steps: protein.steps.map((step) => ({ ...step, additions: scale(step.additions, factor), usesBoneBroth: false })),
    };
    sections = [soupSection, proteinSection];
    soupLines = linesOf([soupSection]);
    otherLines = linesOf([proteinSection]);
  }

  const totals = sumLines([...otherLines, ...soupLines]);
  const soupTotalGrams = recipe.kind === 'soupMeal' ? roundTenth(soupLines.reduce((s, l) => s + l.grams, 0)) : null;
  return {
    recipe,
    title: displayTitle(recipe, protein),
    servings,
    protein,
    devices: summarizeDevices(sections.flatMap((s) => s.steps)),
    sections,
    totals,
    soupLines,
    otherLines,
    nutritionPerPortion: calculateNutrition(
      totals.map((l) => ({ ingredientId: l.ingredientId, grams: l.grams / servings })),
      catalog,
    ),
    soupTotalGrams,
    capacityWarning: soupTotalGrams !== null && soupTotalGrams >= CAPACITY_WARNING_GRAMS,
  };
}

export function minutesOf(recipe: Recipe): number {
  return recipe.kind === 'plate' ? recipe.minutes : recipe.minutesMakingSoup;
}
