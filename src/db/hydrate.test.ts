import { beforeEach, expect, test } from 'vitest';
import { seeds } from '../seed';
import { hydrate } from './hydrate';
import { db } from './index';
import { clearDb } from '../test/db';

beforeEach(clearDb);

test('a fresh database gets profile, seed favorite and soup prefs', async () => {
  await hydrate(db, seeds);
  const profile = await db.profile.get('me');
  expect(profile?.schedule.workEnd).toBe('18:30');
  expect(profile?.nutrition).toEqual({
    proteinDailyGramsRange: [150, 170],
    calorieRangeKcal: [2200, 2300],
    provisional: true,
  });
  expect(await db.favorites.get('fav_salmon_leek_peas')).toMatchObject({ source: 'seed', proteinId: 'salmon' });
  expect((await db.soupPrefs.get('papa'))?.brothType).toBe('bone_ready');
  expect((await db.soupPrefs.get('miso'))?.brothType).toBe('vegetable_concentrate');
  expect((await db.soupPrefs.get('thai'))?.thaiLegume).toBe('none');
  expect(await db.soupPrefs.count()).toBe(9);
  expect((await db.meta.get('seedVersion'))?.value).toBe(1);
});

test('re-running never overwrites edits nor restores a deleted seed favorite', async () => {
  await hydrate(db, seeds);
  await db.profile.update('me', { schedule: { ...seeds.defaults.schedule, workEnd: '19:00' } });
  await db.soupPrefs.update('miso', { brothType: 'bone_ready' });
  await db.favorites.delete('fav_salmon_leek_peas');

  const newSeedFavorite = {
    id: 'fav_new_seed',
    title: 'Pollo + arroz',
    proteinId: 'chicken',
    sideId: 'rice_broccoli',
    starred: true,
    source: 'test',
  };
  await hydrate(db, { ...seeds, foods: { ...seeds.foods, favoriteCombos: [...seeds.foods.favoriteCombos, newSeedFavorite] } });

  expect((await db.profile.get('me'))?.schedule.workEnd).toBe('19:00');
  expect((await db.soupPrefs.get('miso'))?.brothType).toBe('bone_ready');
  expect(await db.favorites.get('fav_salmon_leek_peas')).toBeUndefined();
  expect(await db.favorites.get('fav_new_seed')).toMatchObject({ source: 'seed' });
});

test('an existing favorite row with a seed id is kept as is', async () => {
  await db.favorites.add({
    id: 'fav_salmon_leek_peas',
    proteinId: 'salmon',
    sideId: 'soup_verde',
    title: 'Mi versión',
    source: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  await hydrate(db, seeds);
  expect((await db.favorites.get('fav_salmon_leek_peas'))?.title).toBe('Mi versión');
});

test('two concurrent runs, as under StrictMode, insert each row once', async () => {
  await Promise.all([hydrate(db, seeds), hydrate(db, seeds)]);
  expect(await db.profile.count()).toBe(1);
  expect(await db.favorites.count()).toBe(1);
  expect(await db.soupPrefs.count()).toBe(9);
});
