import type { z } from 'zod';
import rawFixes from '../../data/step-fixes.json';
import rawVariants from '../../data/ichef-variants.json';
import raw from '../../data/recetario.json';
import { applyStepFixes, normalizeRecetario } from '../domain/recipes/normalize';
import { rawRecetarioSchema, rawStepFixesSchema, rawVariantsSchema } from '../domain/recipes/raw.schema';
import type { Recipe, Soup } from '../domain/recipes/types';

function parseWith<S extends z.ZodType>(name: string, schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  throw new Error(`${name} is invalid at "${issue?.path.map(String).join('.') ?? ''}": ${issue?.message ?? 'unknown'}`);
}

function parse() {
  const book = applyStepFixes(
    parseWith('recetario.json', rawRecetarioSchema, raw),
    parseWith('step-fixes.json', rawStepFixesSchema, rawFixes),
  );
  return normalizeRecetario(book, parseWith('ichef-variants.json', rawVariantsSchema, rawVariants));
}

const { catalog, recipes } = parse();

export { catalog, recipes };

export const recipeById: ReadonlyMap<string, Recipe> = new Map(recipes.map((r) => [r.id, r]));

export const soupById: ReadonlyMap<string, Soup> = new Map(
  recipes.flatMap((r) => (r.kind === 'soupMeal' ? [[r.soup.id, r.soup] as const] : [])),
);
