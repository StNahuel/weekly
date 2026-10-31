import raw from '../../data/recetario.json';
import { normalizeRecetario } from '../domain/recipes/normalize';
import { rawRecetarioSchema } from '../domain/recipes/raw.schema';
import type { Recipe, Soup } from '../domain/recipes/types';

function parse() {
  const result = rawRecetarioSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`recetario.json is invalid at "${issue?.path.map(String).join('.') ?? ''}": ${issue?.message ?? 'unknown'}`);
  }
  return normalizeRecetario(result.data);
}

const { catalog, recipes } = parse();

export { catalog, recipes };

export const recipeById: ReadonlyMap<string, Recipe> = new Map(recipes.map((r) => [r.id, r]));

export const soupById: ReadonlyMap<string, Soup> = new Map(
  recipes.flatMap((r) => (r.kind === 'soupMeal' ? [[r.soup.id, r.soup] as const] : [])),
);
