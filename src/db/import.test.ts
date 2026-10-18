import { beforeEach, describe, expect, test } from 'vitest';
import type { MealSlot } from '../domain/day/slots';
import { seeds } from '../seed';
import { clearDb, getProfile } from '../test/db';
import { buildExport, type WeeklyExport } from './export';
import { hydrate, HYDRATED_FAVORITES_KEY } from './hydrate';
import { applyImport, parseImport } from './import';
import { db } from './index';
import { addFavorite, saveProfile, upsertDay } from './repo';

let exported: WeeklyExport;

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
  const profile = await getProfile();
  if (!profile) throw new Error('no profile');
  await saveProfile({ schedule: { ...profile.schedule, workEnd: '19:00' } });
  await upsertDay({
    date: '2026-10-17',
    dayType: 'boxing',
    flexible: false,
    slots: {
      breakfast: { kind: 'empty' },
      lunch: { kind: 'empty' },
      snack: { kind: 'empty' },
      dinner: { kind: 'social', social: 'friends' },
    },
    confirmedAt: '2026-10-17T12:00:00.000Z',
  });
  await addFavorite('chicken', 'rice_broccoli', 'Pollo + arroz');
  exported = await buildExport(db);
});

describe('parseImport', () => {
  test('a valid export parses with its summary', () => {
    const parsed = parseImport(JSON.stringify(exported));
    expect(parsed).toMatchObject({
      ok: true,
      summary: { days: 1, favorites: 2, soupPrefs: 9, hasProfile: true, exportedAt: exported.exportedAt },
    });
  });

  test('rejects files over 2 MB', () => {
    expect(parseImport('x'.repeat(2_000_001))).toEqual({ ok: false, error: 'El archivo supera 2 MB.' });
  });

  test('rejects invalid JSON', () => {
    expect(parseImport('{')).toEqual({ ok: false, error: 'El archivo no es JSON válido.' });
  });

  test('rejects another schema version', () => {
    expect(parseImport(JSON.stringify({ ...exported, schemaVersion: 9 }))).toEqual({
      ok: false,
      error: 'Versión de respaldo no compatible.',
    });
  });

  test('names the first invalid path', () => {
    const badDay = { ...exported, days: [{ ...exported.days[0], dayType: 'cardio' }] };
    expect(parseImport(JSON.stringify(badDay))).toEqual({ ok: false, error: 'Formato no reconocido: days.0.dayType' });
    expect(parseImport(JSON.stringify({ ...exported, extra: true }))).toEqual({
      ok: false,
      error: 'Formato no reconocido: (raíz)',
    });
    expect(parseImport('[]')).toEqual({ ok: false, error: 'Formato no reconocido: (raíz)' });
  });

  test('rejects duplicate keys and over-long text', () => {
    const [favorite] = exported.favorites;
    if (!favorite) throw new Error('no favorite');
    expect(parseImport(JSON.stringify({ ...exported, favorites: [favorite, favorite] }))).toEqual({
      ok: false,
      error: 'Formato no reconocido: favorites',
    });
    const longTitle = { ...exported, favorites: [{ ...favorite, title: 'x'.repeat(201) }] };
    expect(parseImport(JSON.stringify(longTitle))).toEqual({
      ok: false,
      error: 'Formato no reconocido: favorites.0.title',
    });
  });
});

describe('parseImport catalog ids', () => {
  const day = () => exported.days[0]!;
  const favorite = () => exported.favorites[0]!;
  const plan = (slot: MealSlot) => ({
    id: 'current',
    startDate: '2026-10-17',
    horizonDays: 3,
    meals: [{ date: '2026-10-17', mealType: 'dinner', slot }],
    checkedKeys: [],
    removedKeys: [],
    overrides: {},
    updatedAt: '2026-10-17T12:00:00.000Z',
  });

  test('the untampered export, including a valid plan, passes', () => {
    const withPlan = { ...exported, shoppingPlans: [plan({ kind: 'soup', soupId: 'miso', servings: 2 })] };
    expect(parseImport(JSON.stringify(withPlan)).ok).toBe(true);
  });

  test.each<[string, (data: WeeklyExport) => unknown]>([
    [
      'profile.dietary.excludedIngredientIds.0',
      (data) => ({ ...data, profile: { ...data.profile!, dietary: { ...data.profile!.dietary, excludedIngredientIds: ['ghost'] } } }),
    ],
    [
      'days.0.slots.lunch.proteinId',
      (data) => ({ ...data, days: [{ ...day(), slots: { ...day().slots, lunch: { kind: 'combo', proteinId: 'ghost', sideId: 'salad' } } }] }),
    ],
    [
      'days.0.slots.breakfast.templateId',
      (data) => ({ ...data, days: [{ ...day(), slots: { ...day().slots, breakfast: { kind: 'template', templateId: 'ghost' } } }] }),
    ],
    ['favorites.0.sideId', (data) => ({ ...data, favorites: [{ ...favorite(), sideId: 'ghost' }] })],
    ['soupPrefs.0.recipeId', (data) => ({ ...data, soupPrefs: [{ ...data.soupPrefs[0]!, recipeId: 'ghost' }] })],
    [
      'shoppingPlans.0.meals.0.slot.soupId',
      (data) => ({ ...data, shoppingPlans: [plan({ kind: 'soup', soupId: 'ghost', servings: 2 })] }),
    ],
  ])('rejects an unknown id at %s', (path, tamper) => {
    expect(parseImport(JSON.stringify(tamper(exported)))).toEqual({ ok: false, error: `Formato no reconocido: ${path}` });
  });
});

describe('applyImport', () => {
  test('replaces every table and restores the backup', async () => {
    const parsed = parseImport(JSON.stringify(exported));
    if (!parsed.ok) throw new Error(parsed.error);
    await Promise.all([db.profile.clear(), db.days.clear(), db.favorites.clear(), db.soupPrefs.clear()]);
    await db.days.put({ ...exported.days[0]!, date: '2026-10-18' });

    await applyImport(db, parsed.data);

    expect((await getProfile())?.schedule.workEnd).toBe('19:00');
    expect((await db.days.toArray()).map((d) => d.date)).toEqual(['2026-10-17']);
    expect(await db.favorites.get('fav_user_chicken_rice_broccoli')).toMatchObject({ source: 'user' });
    expect(await db.soupPrefs.count()).toBe(9);
    expect((await db.meta.get('lastImportAt'))?.value).toEqual(expect.any(String));
  });

  test('a backup without a profile gets the seed profile and keeps its favorites', async () => {
    await applyImport(db, { ...exported, profile: null, soupPrefs: [] });
    const profile = await db.profile.get('me');
    expect(profile?.schedule.workEnd).toBe(seeds.defaults.schedule.workEnd);
    expect(profile?.schedule.workEnd).not.toBe('19:00');
    expect(await db.favorites.get('fav_user_chicken_rice_broccoli')).toMatchObject({ source: 'user' });
    expect(await db.soupPrefs.count()).toBe(9);
  });

  test('a backup with a profile keeps that profile, not the seed one', async () => {
    await applyImport(db, exported);
    expect((await getProfile())?.schedule.workEnd).toBe('19:00');
  });

  test('keeps seed-favorite bookkeeping so a removed preset stays removed', async () => {
    const withoutPreset = { ...exported, favorites: exported.favorites.filter((f) => f.source === 'user') };
    await applyImport(db, withoutPreset);
    await hydrate(db, seeds);
    expect(await db.favorites.get('fav_salmon_leek_peas')).toBeUndefined();
    expect((await db.meta.get(HYDRATED_FAVORITES_KEY))?.value).toEqual(['fav_salmon_leek_peas']);
  });
});
