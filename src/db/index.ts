import Dexie, { type EntityTable } from 'dexie';
import { applyVersions } from './migrations';
import type {
  DayRecord,
  FavoriteRecord,
  MetaRecord,
  ProfileRecord,
  ShoppingPlanRecord,
  SoupPrefRecord,
} from './types';

export { DB_SCHEMA_VERSION } from './migrations';

export class WeeklyDB extends Dexie {
  declare profile: EntityTable<ProfileRecord, 'id'>;
  declare days: EntityTable<DayRecord, 'date'>;
  declare favorites: EntityTable<FavoriteRecord, 'id'>;
  declare soupPrefs: EntityTable<SoupPrefRecord, 'recipeId'>;
  declare shoppingPlans: EntityTable<ShoppingPlanRecord, 'id'>;
  declare meta: EntityTable<MetaRecord, 'key'>;

  constructor(name: string) {
    super(name);
    applyVersions(this);
  }
}

export const db = new WeeklyDB('weekly');
