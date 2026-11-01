import type Dexie from 'dexie';
import type { MetaRecord, SoupPrefRecord } from './types';

export const SETTINGS_KEY = 'settings';

type OldSoupPref = { recipeId: string; brothType: SoupPrefRecord['brothType']; thaiLegume?: string };
type OldProfile = { device?: { largeText?: boolean } };

export function applyVersions(db: Dexie): void {
  // Never edit a shipped version; add db.version(n).stores({...}).upgrade(tx => ...) below it.
  db.version(1).stores({
    profile: 'id',
    days: 'date',
    favorites: 'id, proteinId, sideId',
    soupPrefs: 'recipeId',
    shoppingPlans: 'id',
    meta: 'key',
  });
  // v2 (unreleased planner) only dropped tables; its row rewrites are irrelevant now that days are gone.
  db.version(2).stores({ favorites: null, shoppingPlans: null });
  // v3: recipe book. Soup prefs move to the embedded soup ids; the text-size setting moves to meta.
  db.version(3)
    .stores({ shopping: 'id' })
    .upgrade(async (tx) => {
      const prefs = tx.table<OldSoupPref & Partial<SoupPrefRecord>, string>('soupPrefs');
      const old = await prefs.toArray();
      await prefs.clear();
      await prefs.bulkPut(
        old.map((p) => ({
          recipeId: p.recipeId.startsWith('soup_') ? p.recipeId : `soup_${p.recipeId}`,
          brothType: p.brothType,
          includeOptional: p.includeOptional ?? p.thaiLegume === 'edamame',
        })),
      );
      const profile = await tx.table<OldProfile, string>('profile').get('me');
      const meta = tx.table<MetaRecord, string>('meta');
      // Planner leftovers (seed version, saved dinners before a social one, import stamps).
      await meta.clear();
      await meta.put({ key: SETTINGS_KEY, value: { largeText: profile?.device?.largeText === true } });
    });
  db.version(4).stores({ profile: null, days: null });
}
