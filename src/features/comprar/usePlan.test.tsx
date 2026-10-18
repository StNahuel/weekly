import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import { removeFavorite, savePlan, setPlanMeal } from '../../db/repo';
import type { MealSlot } from '../../domain/day/slots';
import { seededRng } from '../../domain/meals/testHelpers';
import { seeds } from '../../seed';
import { clearDb, getPlan } from '../../test/db';
import { putDay } from '../hoy/testDay';
import { addSoupToPlan, createPlan, regeneratePlan, usePlan } from './usePlan';

const START = '2026-10-16';
const FAVORITE: MealSlot = { kind: 'combo', proteinId: 'salmon', sideId: 'soup_verde' };
const MISO_2: MealSlot = { kind: 'soup', soupId: 'miso', servings: 2 };
const FRIENDS: MealSlot = { kind: 'social', social: 'friends' };
const TUNA_SALAD: MealSlot = { kind: 'combo', proteinId: 'tuna', sideId: 'salad' };

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
});

describe('createPlan', () => {
  test('stores four meals for each of five days', async () => {
    await createPlan(START, 5);
    const plan = await getPlan();
    expect(plan?.meals).toHaveLength(20);
    expect(new Set(plan?.meals.map((m) => m.date))).toEqual(
      new Set(['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']),
    );
    expect(plan?.horizonDays).toBe(5);
  });

  test('dietary exclusions reach every suggested meal', async () => {
    const rng = seededRng(2);
    const withSalmon = await createPlan(START, 7, { rng });
    expect(withSalmon.meals.some((m) => m.slot.kind === 'combo' && m.slot.proteinId === 'salmon')).toBe(true);
    const plan = await createPlan(START, 7, {
      rng: seededRng(2),
      dietary: { excludedIngredientIds: ['salmon'], excludedTags: [] },
    });
    expect(plan.meals.some((m) => m.slot.kind === 'combo' && m.slot.proteinId === 'salmon')).toBe(false);
  });

  test('a day already confirmed in Hoy keeps its meals; other days are suggested', async () => {
    const day = await putDay('2026-10-17', 'boxing', { lunch: TUNA_SALAD, dinner: FRIENDS });
    const plan = await createPlan(START, 3, { rng: seededRng(1) });
    const confirmed = plan.meals.filter((m) => m.date === '2026-10-17');
    expect(Object.fromEntries(confirmed.map((m) => [m.mealType, m.slot]))).toEqual(day.slots);
    const suggested = plan.meals.filter((m) => m.date !== '2026-10-17');
    expect(suggested.every((m) => m.slot.kind === 'template' || m.slot.kind === 'combo')).toBe(true);
  });

  test('usePlan follows the stored plan', async () => {
    const { result } = renderHook(() => usePlan());
    await waitFor(() => expect(result.current).toBeNull());
    await createPlan(START, 3);
    await waitFor(() => expect(result.current?.meals).toHaveLength(12));
  });
});

describe('regeneratePlan', () => {
  test('keeps a favorite dinner already in the plan and resuggests the rest', async () => {
    const expected = (await createPlan(START, 5, { rng: seededRng(1) })).meals;
    const dinner = expected.findIndex((m) => m.mealType === 'dinner');
    expect(expected[dinner]?.slot).not.toEqual(FAVORITE);
    await setPlanMeal(dinner, FAVORITE);

    const kept = await regeneratePlan(START, 5, { rng: seededRng(1) });
    expect(kept.meals[dinner]?.slot).toEqual(FAVORITE);
    expect(kept.meals.filter((_, i) => i !== dinner)).toEqual(expected.filter((_, i) => i !== dinner));
  });

  test('the same dinner is resuggested once it is no longer a favorite', async () => {
    const expected = (await createPlan(START, 5, { rng: seededRng(1) })).meals;
    const dinner = expected.findIndex((m) => m.mealType === 'dinner');
    await setPlanMeal(dinner, FAVORITE);
    await removeFavorite('fav_salmon_leek_peas');

    const regenerated = await regeneratePlan(START, 5, { rng: seededRng(1) });
    expect(regenerated.meals).toEqual(expected);
  });

  test('keeps social, free, skipped and added-soup meals; a non-favorite combo is resuggested', async () => {
    const created = await createPlan(START, 5, { rng: seededRng(1) });
    const dinner = created.meals.findIndex((m) => m.mealType === 'dinner');
    const lunch = created.meals.findIndex((m) => m.mealType === 'lunch' && m.date === '2026-10-18');
    const breakfast = created.meals.findIndex((m) => m.mealType === 'breakfast');
    const snack = created.meals.findIndex((m) => m.mealType === 'snack');
    await setPlanMeal(dinner, FRIENDS);
    await setPlanMeal(breakfast, { kind: 'skip' });
    await setPlanMeal(snack, { kind: 'free' });
    await addSoupToPlan('miso', 2);
    expect((await getPlan())?.meals).toHaveLength(21);

    const regenerated = await regeneratePlan(START, 5, { rng: seededRng(5) });
    expect(regenerated.meals).toHaveLength(21);
    expect(regenerated.meals[dinner]?.slot).toEqual(FRIENDS);
    expect(regenerated.meals[breakfast]?.slot).toEqual({ kind: 'skip' });
    expect(regenerated.meals[snack]?.slot).toEqual({ kind: 'free' });
    expect(regenerated.meals.filter((m) => m.slot.kind === 'soup')).toEqual([
      { date: '2026-10-20', mealType: 'dinner', slot: MISO_2 },
    ]);
    expect(created.meals[lunch]?.slot.kind).toBe('combo');
    expect(created.meals[lunch]?.slot).not.toEqual(FAVORITE);
    expect(regenerated.meals[lunch]?.slot).not.toEqual(created.meals[lunch]?.slot);
  });

  test('a confirmed day in Hoy wins over the previous plan for that date', async () => {
    const created = await createPlan(START, 3, { rng: seededRng(1) });
    const dinner = created.meals.findIndex((m) => m.mealType === 'dinner' && m.date === '2026-10-17');
    await setPlanMeal(dinner, FRIENDS);
    await putDay('2026-10-17', 'boxing', { dinner: TUNA_SALAD });
    const regenerated = await regeneratePlan(START, 3, { rng: seededRng(1) });
    expect(regenerated.meals[dinner]?.slot).toEqual(TUNA_SALAD);
  });

  test('resets checked, removed and edited groceries', async () => {
    const plan = await createPlan(START, 3);
    await savePlan({ ...plan, checkedKeys: ['salmon|raw'], removedKeys: ['rice_dry|dry'], overrides: { 'salmon|raw': 1 } });
    const regenerated = await regeneratePlan(START, 3);
    expect([regenerated.checkedKeys, regenerated.removedKeys, regenerated.overrides]).toEqual([[], [], {}]);
  });
});

describe('addSoupToPlan', () => {
  test('creates a default plan and adds the soup as an extra dinner on its last day', async () => {
    await addSoupToPlan('miso', 2, new Date('2026-10-17T02:00:00Z'));
    const plan = await getPlan();
    expect(plan?.startDate).toBe('2026-10-16');
    expect(plan?.horizonDays).toBe(5);
    expect(plan?.meals).toHaveLength(21);
    expect(plan?.meals.at(-1)).toEqual({ date: '2026-10-20', mealType: 'dinner', slot: MISO_2 });
  });

  test('fills the first empty dinner when there is one', async () => {
    const plan = await createPlan(START, 3);
    const meals = plan.meals.map((m) => (m.mealType === 'dinner' && m.date !== START ? { ...m, slot: { kind: 'empty' } as const } : m));
    await savePlan({ ...plan, meals });
    await addSoupToPlan('miso', 2);
    const stored = await getPlan();
    expect(stored?.meals).toHaveLength(12);
    const dinners = stored?.meals.filter((m) => m.mealType === 'dinner').map((m) => [m.date, m.slot.kind]);
    expect(dinners).toEqual([
      ['2026-10-16', 'combo'],
      ['2026-10-17', 'soup'],
      ['2026-10-18', 'empty'],
    ]);
  });
});
