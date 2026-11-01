import { z } from 'zod';
import { BROTH_TYPES } from '../domain/recipes/types';
import { recipeById, soupById } from '../seed';
import type { WeeklyDB } from './index';
import { SETTINGS_KEY } from './migrations';
import { DEFAULT_SETTINGS } from './repo';

export const BACKUP_SCHEMA_VERSION = 3;
export const MAX_IMPORT_CHARS = 2_000_000;
export const IMPORT_TOO_LARGE = 'El archivo supera 2 MB.';

const id = z.string().min(1).max(200);
const isoDateTime = z.iso.datetime();

const entrySchema = z
  .object({
    key: id,
    recipeId: id,
    servings: z.number().int().min(1).max(20),
    proteinId: id.exactOptional(),
    soupOnly: z.boolean().exactOptional(),
  })
  .strict();

export const backupSchema = z
  .object({
    app: z.literal('weekly'),
    schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
    exportedAt: isoDateTime,
    settings: z.object({ largeText: z.boolean() }).strict(),
    soupPrefs: z
      .array(z.object({ recipeId: id, brothType: z.enum(BROTH_TYPES), includeOptional: z.boolean() }).strict())
      .max(100),
    shopping: z
      .object({
        id: z.literal('current'),
        entries: z.array(entrySchema).max(200),
        checked: z.array(id).max(500),
        updatedAt: isoDateTime,
      })
      .strict()
      .nullable(),
  })
  .strict();

export type Backup = z.infer<typeof backupSchema>;

export type ImportSummary = { soupPrefs: number; shoppingEntries: number; exportedAt: string };

export type ParsedImport = { ok: true; data: Backup; summary: ImportSummary } | { ok: false; error: string };

export async function buildBackup(db: WeeklyDB, now: Date = new Date()): Promise<Backup> {
  const [settings, soupPrefs, shopping] = await db.transaction('r', [db.meta, db.soupPrefs, db.shopping], () =>
    Promise.all([db.meta.get(SETTINGS_KEY), db.soupPrefs.toArray(), db.shopping.get('current')]),
  );
  return backupSchema.parse({
    app: 'weekly',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    settings: settings?.value ?? DEFAULT_SETTINGS,
    soupPrefs,
    shopping: shopping ?? null,
  });
}

const fileDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo' });

export function downloadBackup(data: Backup, now: Date = new Date()): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `weekly-backup-${fileDate.format(now)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  // iOS Safari reads the blob after click() returns, so revoking synchronously can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseImport(text: string): ParsedImport {
  if (text.length > MAX_IMPORT_CHARS) return { ok: false, error: IMPORT_TOO_LARGE };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es JSON válido.' };
  }
  const version = typeof json === 'object' && json !== null && 'schemaVersion' in json ? json.schemaVersion : undefined;
  if (version !== BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: 'Este respaldo es de una versión anterior de la app y no se puede importar.' };
  }
  const result = backupSchema.safeParse(json);
  if (!result.success) {
    const path = result.error.issues[0]?.path.map(String).join('.') ?? '';
    return { ok: false, error: `Formato no reconocido: ${path || '(raíz)'}` };
  }
  const data = result.data;
  // Unknown ids (a recipe removed from the catalog) are dropped instead of failing the whole import.
  const cleaned: Backup = {
    ...data,
    soupPrefs: data.soupPrefs.filter((p) => soupById.has(p.recipeId)),
    shopping: data.shopping && { ...data.shopping, entries: data.shopping.entries.filter((e) => recipeById.has(e.recipeId)) },
  };
  return {
    ok: true,
    data: cleaned,
    summary: {
      soupPrefs: cleaned.soupPrefs.length,
      shoppingEntries: cleaned.shopping?.entries.length ?? 0,
      exportedAt: cleaned.exportedAt,
    },
  };
}

export async function applyImport(db: WeeklyDB, data: Backup): Promise<void> {
  await db.transaction('rw', [db.meta, db.soupPrefs, db.shopping], async () => {
    await Promise.all([db.soupPrefs.clear(), db.shopping.clear()]);
    await db.meta.put({ key: SETTINGS_KEY, value: data.settings });
    await db.soupPrefs.bulkAdd(data.soupPrefs);
    if (data.shopping) await db.shopping.add(data.shopping);
  });
}
