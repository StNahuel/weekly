import type { MealSlot } from '../domain/day/slots';
import { MEAL_TYPES } from '../domain/types';
import { seeds } from '../seed';
import { ingredientById, lunchById, swaps, templateById } from '../seed/foods';
import { recipeById } from '../seed/soups';
import { EXPORT_SCHEMA_VERSION, exportSchema, type WeeklyExport } from './export';
import { exportSchemaV1, type WeeklyExportV1 } from './exportV1';
import { hydrate } from './hydrate';
import type { WeeklyDB } from './index';
import { migrateDayV1, migrateProfileV1, v1LookupFromSeeds } from './migrateSlots';

export const MAX_IMPORT_CHARS = 2_000_000;
export const IMPORT_TOO_LARGE = 'El archivo supera 2 MB.';

export type ImportSummary = {
  days: number;
  soupPrefs: number;
  hasProfile: boolean;
  exportedAt: string;
  fromVersion: 1 | 2;
  emptiedSlots: number;
};

export type ParsedImport = { ok: true; data: WeeklyExport; summary: ImportSummary } | { ok: false; error: string };

const fail = (error: string): ParsedImport => ({ ok: false, error });

type Path = (string | number)[];
type IdCheck = { path: Path; id: string; known: ReadonlySet<string> | ReadonlyMap<string, unknown> };

const SWAP_PROTEINS = new Set(swaps.proteins);
const SWAP_CARBS = new Set(swaps.lunchCarbs);

const lineChecks = (lines: readonly { ingredientId: string }[], path: Path): IdCheck[] =>
  lines.map((line, i) => ({ path: [...path, i, 'ingredientId'], id: line.ingredientId, known: ingredientById }));

function slotChecks(slot: MealSlot, path: Path): IdCheck[] {
  switch (slot.kind) {
    case 'template':
      return [
        { path: [...path, 'templateId'], id: slot.templateId, known: templateById },
        ...Object.keys(slot.gramOverrides ?? {}).map((key) => ({
          path: [...path, 'gramOverrides', key],
          id: key,
          known: ingredientById,
        })),
      ];
    case 'lunch':
      return [
        { path: [...path, 'presetId'], id: slot.presetId, known: lunchById },
        { path: [...path, 'proteinId'], id: slot.proteinId, known: SWAP_PROTEINS },
        { path: [...path, 'carbId'], id: slot.carbId, known: SWAP_CARBS },
        ...lineChecks(slot.vegetables, [...path, 'vegetables']),
      ];
    case 'dinner':
      return [
        { path: [...path, 'proteinId'], id: slot.proteinId, known: SWAP_PROTEINS },
        { path: [...path, 'soupRecipeId'], id: slot.soupRecipeId, known: recipeById },
      ];
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
    ...data.soupPrefs.map((pref, i) => ({ path: ['soupPrefs', i, 'recipeId'], id: pref.recipeId, known: recipeById })),
  ];
  const unknown = checks.find(({ id, known }) => !known.has(id));
  return unknown ? unknown.path.join('.') : null;
}

function fromV1(v1: WeeklyExportV1): { data: WeeklyExport; emptiedSlots: number } {
  const lookup = v1LookupFromSeeds(seeds);
  const days = v1.days.map((day) => migrateDayV1(day, lookup));
  const emptiedSlots = days.reduce(
    (count, day, d) =>
      count +
      MEAL_TYPES.filter((meal) => day.slots[meal].kind === 'empty' && v1.days[d]?.slots[meal].kind !== 'empty').length,
    0,
  );
  return {
    data: {
      app: 'weekly',
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: v1.exportedAt,
      profile: v1.profile && migrateProfileV1(v1.profile, lookup.targetKcal, lookup.ingredientIds),
      days,
      soupPrefs: v1.soupPrefs,
    },
    emptiedSlots,
  };
}

function parseVersioned(json: unknown): { data: WeeklyExport; fromVersion: 1 | 2; emptiedSlots: number } | string {
  const version = typeof json === 'object' && json !== null && 'schemaVersion' in json ? json.schemaVersion : undefined;
  if (version !== 1 && version !== EXPORT_SCHEMA_VERSION) return 'Versión de respaldo no compatible.';
  const result = version === 1 ? exportSchemaV1.safeParse(json) : exportSchema.safeParse(json);
  if (!result.success) {
    const path = result.error.issues[0]?.path.map(String).join('.') ?? '';
    return `Formato no reconocido: ${path || '(raíz)'}`;
  }
  if (result.data.schemaVersion === 1) return { ...fromV1(result.data), fromVersion: 1 };
  return { data: result.data, fromVersion: 2, emptiedSlots: 0 };
}

export function parseImport(text: string): ParsedImport {
  if (text.length > MAX_IMPORT_CHARS) return fail(IMPORT_TOO_LARGE);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail('El archivo no es JSON válido.');
  }
  const parsed = parseVersioned(json);
  if (typeof parsed === 'string') return fail(parsed);
  const { data, fromVersion, emptiedSlots } = parsed;
  const unknownPath = unknownIdPath(data);
  if (unknownPath) return fail(`Formato no reconocido: ${unknownPath}`);
  return {
    ok: true,
    data,
    summary: {
      days: data.days.length,
      soupPrefs: data.soupPrefs.length,
      hasProfile: data.profile !== null,
      exportedAt: data.exportedAt,
      fromVersion,
      emptiedSlots,
    },
  };
}

export async function applyImport(db: WeeklyDB, data: WeeklyExport): Promise<void> {
  await db.transaction('rw', [db.profile, db.days, db.soupPrefs, db.meta], async () => {
    await Promise.all([db.profile.clear(), db.days.clear(), db.soupPrefs.clear()]);
    if (data.profile) await db.profile.add(data.profile);
    await db.days.bulkAdd(data.days);
    await db.soupPrefs.bulkAdd(data.soupPrefs);
    await db.meta.put({ key: 'lastImportAt', value: new Date().toISOString() });
    // A backup without a profile would otherwise leave the app profile-less until reload.
    await hydrate(db, seeds);
  });
}
