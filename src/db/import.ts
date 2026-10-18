import type { MealSlot } from '../domain/day/slots';
import { MEAL_TYPES } from '../domain/types';
import { seeds } from '../seed';
import { ingredientById, proteinById, sideById, templateById } from '../seed/foods';
import { recipeById } from '../seed/soups';
import { EXPORT_SCHEMA_VERSION, exportSchema, type WeeklyExport } from './export';
import { hydrate } from './hydrate';
import type { WeeklyDB } from './index';

export const MAX_IMPORT_CHARS = 2_000_000;
export const IMPORT_TOO_LARGE = 'El archivo supera 2 MB.';

export type ImportSummary = {
  days: number;
  favorites: number;
  soupPrefs: number;
  hasProfile: boolean;
  exportedAt: string;
};

export type ParsedImport = { ok: true; data: WeeklyExport; summary: ImportSummary } | { ok: false; error: string };

const fail = (error: string): ParsedImport => ({ ok: false, error });

type IdCheck = { path: (string | number)[]; id: string; known: ReadonlyMap<string, unknown> };

function slotChecks(slot: MealSlot, path: (string | number)[]): IdCheck[] {
  switch (slot.kind) {
    case 'combo':
      return [
        { path: [...path, 'proteinId'], id: slot.proteinId, known: proteinById },
        { path: [...path, 'sideId'], id: slot.sideId, known: sideById },
      ];
    case 'template':
      return [{ path: [...path, 'templateId'], id: slot.templateId, known: templateById }];
    case 'soup':
      return [{ path: [...path, 'soupId'], id: slot.soupId, known: recipeById }];
    default:
      return [];
  }
}

function unknownIdPath(data: WeeklyExport): string | null {
  const checks: IdCheck[] = [
    ...(data.profile?.dietary.excludedIngredientIds ?? []).map((id, i) => ({
      path: ['profile', 'dietary', 'excludedIngredientIds', i],
      id,
      known: ingredientById,
    })),
    ...data.days.flatMap((day, d) => MEAL_TYPES.flatMap((meal) => slotChecks(day.slots[meal], ['days', d, 'slots', meal]))),
    ...data.favorites.flatMap((favorite, i) => [
      { path: ['favorites', i, 'proteinId'], id: favorite.proteinId, known: proteinById },
      { path: ['favorites', i, 'sideId'], id: favorite.sideId, known: sideById },
    ]),
    ...data.soupPrefs.map((pref, i) => ({ path: ['soupPrefs', i, 'recipeId'], id: pref.recipeId, known: recipeById })),
    ...data.shoppingPlans.flatMap((plan, p) =>
      plan.meals.flatMap((meal, i) => slotChecks(meal.slot, ['shoppingPlans', p, 'meals', i, 'slot'])),
    ),
  ];
  const unknown = checks.find(({ id, known }) => !known.has(id));
  return unknown ? unknown.path.join('.') : null;
}

export function parseImport(text: string): ParsedImport {
  if (text.length > MAX_IMPORT_CHARS) return fail(IMPORT_TOO_LARGE);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail('El archivo no es JSON válido.');
  }
  if (typeof json === 'object' && json !== null && 'schemaVersion' in json && json.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    return fail('Versión de respaldo no compatible.');
  }
  const result = exportSchema.safeParse(json);
  if (!result.success) {
    const path = result.error.issues[0]?.path.map(String).join('.') ?? '';
    return fail(`Formato no reconocido: ${path || '(raíz)'}`);
  }
  const data = result.data;
  const unknownPath = unknownIdPath(data);
  if (unknownPath) return fail(`Formato no reconocido: ${unknownPath}`);
  return {
    ok: true,
    data,
    summary: {
      days: data.days.length,
      favorites: data.favorites.length,
      soupPrefs: data.soupPrefs.length,
      hasProfile: data.profile !== null,
      exportedAt: data.exportedAt,
    },
  };
}

// meta is not part of a backup, so seed-favorite bookkeeping survives an import.
export async function applyImport(db: WeeklyDB, data: WeeklyExport): Promise<void> {
  const tables = [db.profile, db.days, db.favorites, db.soupPrefs, db.shoppingPlans, db.meta];
  await db.transaction('rw', tables, async () => {
    await Promise.all([
      db.profile.clear(),
      db.days.clear(),
      db.favorites.clear(),
      db.soupPrefs.clear(),
      db.shoppingPlans.clear(),
    ]);
    if (data.profile) await db.profile.add(data.profile);
    await db.days.bulkAdd(data.days);
    await db.favorites.bulkAdd(data.favorites);
    await db.soupPrefs.bulkAdd(data.soupPrefs);
    await db.shoppingPlans.bulkAdd(data.shoppingPlans);
    await db.meta.put({ key: 'lastImportAt', value: new Date().toISOString() });
    // A backup without a profile would otherwise leave the app profile-less until reload.
    await hydrate(db, seeds);
  });
}
