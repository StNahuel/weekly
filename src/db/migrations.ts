import type Dexie from 'dexie';

export const DB_SCHEMA_VERSION = 1;

export function applyVersions(db: Dexie): void {
  db.version(1).stores({
    profile: 'id',
    days: 'date',
    favorites: 'id, proteinId, sideId',
    soupPrefs: 'recipeId',
    shoppingPlans: 'id',
    meta: 'key',
  });
  // Never edit a shipped version; add db.version(n).stores({...}).upgrade(tx => ...) below it.
}
