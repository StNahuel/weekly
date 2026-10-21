import Dexie, { type EntityTable } from 'dexie';
import { applyVersions } from './migrations';
import type { DayRecord, MetaRecord, ProfileRecord, SoupPrefRecord } from './types';

export { DB_SCHEMA_VERSION } from './migrations';

export class WeeklyDB extends Dexie {
  declare profile: EntityTable<ProfileRecord, 'id'>;
  declare days: EntityTable<DayRecord, 'date'>;
  declare soupPrefs: EntityTable<SoupPrefRecord, 'recipeId'>;
  declare meta: EntityTable<MetaRecord, 'key'>;

  constructor(name: string) {
    super(name);
    applyVersions(this);
  }
}

export const db = new WeeklyDB('weekly');
