import { useLiveQuery } from 'dexie-react-hooks';
import type { SoupPrefs } from '../domain/recipes/resolve';
import type { ShoppingEntry } from '../domain/recipes/shopping';
import type { Soup } from '../domain/recipes/types';
import { db } from './index';
import { SETTINGS_KEY } from './migrations';
import type { Settings, ShoppingRecord, SoupPrefRecord } from './types';

export const DEFAULT_SETTINGS: Settings = { largeText: false };

const isSettings = (value: unknown): value is Settings =>
  typeof value === 'object' && value !== null && 'largeText' in value && typeof value.largeText === 'boolean';

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const value = (await db.meta.get(SETTINGS_KEY))?.value;
    return isSettings(value) ? value : DEFAULT_SETTINGS;
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.meta.put({ key: SETTINGS_KEY, value: settings });
}

export function soupPrefsOf(soup: Soup, record: SoupPrefRecord | undefined): SoupPrefs {
  return { brothType: record?.brothType ?? soup.defaultBroth, includeOptional: record?.includeOptional ?? false };
}

export function useSoupPrefRecords(): ReadonlyMap<string, SoupPrefRecord> | undefined {
  return useLiveQuery(async () => new Map((await db.soupPrefs.toArray()).map((p) => [p.recipeId, p])));
}

export async function saveSoupPrefs(soup: Soup, patch: Partial<SoupPrefs>): Promise<void> {
  await db.transaction('rw', db.soupPrefs, async () => {
    const current = soupPrefsOf(soup, await db.soupPrefs.get(soup.id));
    await db.soupPrefs.put({ recipeId: soup.id, ...current, ...patch });
  });
}

const EMPTY_SHOPPING = (): ShoppingRecord => ({
  id: 'current',
  entries: [],
  checked: [],
  updatedAt: new Date().toISOString(),
});

export function useShopping(): ShoppingRecord | undefined {
  return useLiveQuery(async () => (await db.shopping.get('current')) ?? EMPTY_SHOPPING());
}

async function updateShopping(change: (current: ShoppingRecord) => Partial<ShoppingRecord>): Promise<void> {
  await db.transaction('rw', db.shopping, async () => {
    const current = (await db.shopping.get('current')) ?? EMPTY_SHOPPING();
    await db.shopping.put({ ...current, ...change(current), updatedAt: new Date().toISOString() });
  });
}

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function addShoppingEntry(entry: Omit<ShoppingEntry, 'key'>): Promise<void> {
  return updateShopping((s) => ({ entries: [...s.entries, { ...entry, key: newKey() }] }));
}

export function updateShoppingEntry(key: string, patch: Partial<Omit<ShoppingEntry, 'key' | 'recipeId'>>): Promise<void> {
  return updateShopping((s) => ({ entries: s.entries.map((e) => (e.key === key ? { ...e, ...patch } : e)) }));
}

export function removeShoppingEntry(key: string): Promise<void> {
  return updateShopping((s) => ({ entries: s.entries.filter((e) => e.key !== key) }));
}

export function toggleChecked(ingredientId: string): Promise<void> {
  return updateShopping((s) => ({
    checked: s.checked.includes(ingredientId) ? s.checked.filter((id) => id !== ingredientId) : [...s.checked, ingredientId],
  }));
}

export function clearChecked(): Promise<void> {
  return updateShopping(() => ({ checked: [] }));
}

export function clearShopping(): Promise<void> {
  return updateShopping(() => ({ entries: [], checked: [] }));
}
