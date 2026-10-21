import Dexie from 'dexie';
import type { V1DayRecord, V1ProfileRecord } from './exportV1';
import { isV1Slot, migrateDayV1, migrateProfileV1, migrateSlotV1, v1LookupFromSeeds } from './migrateSlots';
import type { DayRecord, MetaRecord, ProfileRecord } from './types';

export const DB_SCHEMA_VERSION = 2;

const LAST_DINNER_PREFIX = 'lastDinnerBeforeSocial:';

const isV1Profile = (profile: V1ProfileRecord | ProfileRecord): profile is V1ProfileRecord =>
  !('dailyCalorieTargetKcal' in profile.nutrition);

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
  db.version(2)
    .stores({ profile: 'id', days: 'date', soupPrefs: 'recipeId', meta: 'key', favorites: null, shoppingPlans: null })
    .upgrade(async (tx) => {
      // Seeds load lazily; waitFor keeps the upgrade transaction alive across the import.
      const { seeds } = await Dexie.waitFor(import('../seed'));
      const lookup = v1LookupFromSeeds(seeds);
      await tx.table<V1DayRecord | DayRecord, string>('days').toCollection().modify((day, ref) => {
        if (!('flags' in day)) ref.value = migrateDayV1(day, lookup);
      });
      await tx.table<V1ProfileRecord | ProfileRecord, string>('profile').toCollection().modify((profile, ref) => {
        if (isV1Profile(profile)) ref.value = migrateProfileV1(profile, lookup.targetKcal, lookup.ingredientIds);
      });
      const meta = tx.table<MetaRecord, string>('meta');
      await meta.delete('hydratedSeedFavoriteIds');
      await meta
        .where('key')
        .startsWith(LAST_DINNER_PREFIX)
        .modify((row) => {
          if (isV1Slot(row.value)) row.value = migrateSlotV1(row.value, lookup);
        });
    });
}
