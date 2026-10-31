import Dexie, { type EntityTable } from 'dexie';
import { applyVersions } from './migrations';
import type { MetaRecord, ShoppingRecord, SoupPrefRecord } from './types';

export class WeeklyDB extends Dexie {
  declare soupPrefs: EntityTable<SoupPrefRecord, 'recipeId'>;
  declare shopping: EntityTable<ShoppingRecord, 'id'>;
  declare meta: EntityTable<MetaRecord, 'key'>;

  constructor(name: string) {
    super(name);
    applyVersions(this);
  }
}

export const db = new WeeklyDB('weekly');
