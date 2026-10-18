import { expect, test } from 'vitest';
import { db, DB_SCHEMA_VERSION } from './index';

test('opens version 1 with the six tables', async () => {
  await db.open();
  expect(db.verno).toBe(1);
  expect(DB_SCHEMA_VERSION).toBe(1);
  expect(db.tables.map((t) => t.name).sort()).toEqual([
    'days',
    'favorites',
    'meta',
    'profile',
    'shoppingPlans',
    'soupPrefs',
  ]);
});
