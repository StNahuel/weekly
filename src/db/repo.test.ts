import { beforeEach, describe, expect, test } from 'vitest';
import { seeds } from '../seed';
import { clearDb, getDay, getPlan, getProfile, getSoupPrefs, listFavorites } from '../test/db';
import { hydrate } from './hydrate';
import { db } from './index';
import {
  addFavorite,
  removeFavorite,
  removeGroceryItem,
  resetChecked,
  restoreGroceryItems,
  saveProfile,
  savePlan,
  saveSoupPrefs,
  setDayType,
  setGroceryOverride,
  setPlanMeal,
  setSlot,
  toggleChecked,
  upsertDay,
} from './repo';
import type { DayRecord, ShoppingPlanRecord } from './types';

const day: DayRecord = {
  date: '2026-10-19',
  dayType: 'strength',
  flexible: false,
  slots: {
    breakfast: { kind: 'template', templateId: 'yogurt_fruit' },
    lunch: { kind: 'combo', proteinId: 'chicken', sideId: 'rice_broccoli' },
    snack: { kind: 'empty' },
    dinner: { kind: 'combo', proteinId: 'salmon', sideId: 'soup_verde' },
  },
  confirmedAt: '2026-10-19T11:00:00.000Z',
};

const plan: ShoppingPlanRecord = {
  id: 'current',
  startDate: '2026-10-19',
  horizonDays: 5,
  meals: [],
  checkedKeys: [],
  removedKeys: [],
  overrides: {},
  updatedAt: '2026-10-19T11:00:00.000Z',
};

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
});

describe('days', () => {
  test('setDayType changes only the day type and keeps slots', async () => {
    await upsertDay(day);
    await setDayType(day.date, 'busy');
    const stored = await getDay(day.date);
    expect(stored?.dayType).toBe('busy');
    expect(stored?.slots).toEqual(day.slots);
    expect(stored?.confirmedAt).toBe(day.confirmedAt);
  });

  test('setSlot replaces one slot and leaves the others', async () => {
    await upsertDay(day);
    await setSlot(day.date, 'dinner', { kind: 'social', social: 'friends' });
    const stored = await getDay(day.date);
    expect(stored?.slots.dinner).toEqual({ kind: 'social', social: 'friends' });
    expect(stored?.slots.lunch).toEqual(day.slots.lunch);
    expect(stored?.dayType).toBe('strength');
  });

  test('writes to a missing day are rejected', async () => {
    await expect(setDayType('2026-01-01', 'busy')).rejects.toThrow('Day 2026-01-01 missing');
    await expect(setSlot('2026-01-01', 'lunch', { kind: 'skip' })).rejects.toThrow('Day 2026-01-01 missing');
  });
});

describe('profile', () => {
  test('saveProfile merges the patch', async () => {
    const before = await getProfile();
    if (!before) throw new Error('no profile');
    await saveProfile({ schedule: { ...before.schedule, workEnd: '17:30' } });
    const after = await getProfile();
    expect(after?.schedule.workEnd).toBe('17:30');
    expect(after?.nutrition).toEqual(before.nutrition);
  });

  test('saveProfile without a profile is rejected', async () => {
    await db.profile.clear();
    await expect(saveProfile({ device: { largeText: true } })).rejects.toThrow('Profile missing');
  });
});

describe('favorites', () => {
  test('adding the same combo twice keeps one row and removal deletes it', async () => {
    const first = await addFavorite('chicken', 'rice_broccoli', 'Pollo + arroz');
    const second = await addFavorite('chicken', 'rice_broccoli', 'Pollo + arroz');
    expect(second.id).toBe(first.id);
    expect(first.source).toBe('user');
    expect((await listFavorites()).map((f) => f.id).sort()).toEqual([first.id, 'fav_salmon_leek_peas'].sort());
    await removeFavorite(first.id);
    expect((await listFavorites()).map((f) => f.id)).toEqual(['fav_salmon_leek_peas']);
  });
});

describe('soup prefs', () => {
  test('overrides persist and undefined resets them', async () => {
    await saveSoupPrefs('miso', { brothType: 'bone_ready', boneBrothGramsFor3: 200 });
    expect(await getSoupPrefs('miso')).toEqual({
      recipeId: 'miso',
      brothType: 'bone_ready',
      boneBrothGramsFor3: 200,
      thaiLegume: 'none',
    });
    await saveSoupPrefs('miso', { boneBrothGramsFor3: undefined });
    expect(await getSoupPrefs('miso')).not.toHaveProperty('boneBrothGramsFor3');
  });

  test('an unknown recipe is rejected', async () => {
    await expect(saveSoupPrefs('nope', { thaiLegume: 'none' })).rejects.toThrow('Soup prefs for nope missing');
  });
});

describe('shopping plan', () => {
  test('toggleChecked twice returns to no checked keys', async () => {
    await savePlan(plan);
    expect(await toggleChecked('rice_dry|dry')).toEqual(['rice_dry|dry']);
    expect(await toggleChecked('rice_dry|dry')).toEqual([]);
    expect((await getPlan())?.checkedKeys).toEqual([]);
  });

  test('toggleChecked without a plan is rejected', async () => {
    await expect(toggleChecked('rice_dry|dry')).rejects.toThrow('Shopping plan missing');
  });

  test('resetChecked clears every checked key', async () => {
    await savePlan({ ...plan, checkedKeys: ['rice_dry|dry', 'salmon|raw'] });
    await resetChecked();
    expect((await getPlan())?.checkedKeys).toEqual([]);
  });

  test('setPlanMeal replaces one meal and rejects an unknown index', async () => {
    const meals = [
      { date: '2026-10-19', mealType: 'lunch', slot: { kind: 'empty' } },
      { date: '2026-10-19', mealType: 'dinner', slot: { kind: 'empty' } },
    ] as const;
    await savePlan({ ...plan, meals: [...meals] });
    await setPlanMeal(1, { kind: 'skip' });
    expect((await getPlan())?.meals.map((m) => m.slot)).toEqual([{ kind: 'empty' }, { kind: 'skip' }]);
    await expect(setPlanMeal(5, { kind: 'skip' })).rejects.toThrow('Planned meal 5 missing');
  });

  test('removed items are recorded once and restored together', async () => {
    await savePlan(plan);
    await removeGroceryItem('salmon|raw');
    await removeGroceryItem('salmon|raw');
    expect((await getPlan())?.removedKeys).toEqual(['salmon|raw']);
    await restoreGroceryItems();
    expect((await getPlan())?.removedKeys).toEqual([]);
  });

  test('a grocery override is stored and an undefined amount drops it', async () => {
    await savePlan(plan);
    await setGroceryOverride('salmon|raw', 500);
    expect((await getPlan())?.overrides).toEqual({ 'salmon|raw': 500 });
    await setGroceryOverride('salmon|raw', undefined);
    expect((await getPlan())?.overrides).toEqual({});
  });
});
