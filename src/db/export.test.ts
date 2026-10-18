import { afterEach, beforeEach, describe, expect, expectTypeOf, test, vi } from 'vitest';
import type { z } from 'zod';
import { seeds } from '../seed';
import { clearDb } from '../test/db';
import { buildExport, downloadExport, exportSchema, mealSlotSchema, type WeeklyExport } from './export';
import { hydrate } from './hydrate';
import { db } from './index';
import { addFavorite, upsertDay } from './repo';
import type { DayRecord, FavoriteRecord, ProfileRecord, ShoppingPlanRecord, SoupPrefRecord } from './types';

const day: DayRecord = {
  date: '2026-10-17',
  dayType: 'rest',
  flexible: true,
  slots: {
    breakfast: { kind: 'template', templateId: 'yogurt_fruit' },
    lunch: { kind: 'combo', proteinId: 'chicken', sideId: 'rice_broccoli' },
    snack: { kind: 'skip' },
    dinner: { kind: 'social', social: 'family' },
  },
  confirmedAt: '2026-10-17T12:00:00.000Z',
};

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
  await upsertDay(day);
  await addFavorite('chicken', 'rice_broccoli', 'Pollo + arroz');
});

test('export schema output matches the stored record types', () => {
  type Out = z.infer<typeof exportSchema>;
  expectTypeOf<NonNullable<Out['profile']>>().toEqualTypeOf<ProfileRecord>();
  expectTypeOf<Out['days'][number]>().toEqualTypeOf<DayRecord>();
  expectTypeOf<Out['favorites'][number]>().toEqualTypeOf<FavoriteRecord>();
  expectTypeOf<Out['soupPrefs'][number]>().toEqualTypeOf<SoupPrefRecord>();
  expectTypeOf<Out['shoppingPlans'][number]>().toEqualTypeOf<ShoppingPlanRecord>();
});

describe('mealSlotSchema', () => {
  test('accepts soup and free slots and rejects unsupported soup servings', () => {
    expect(mealSlotSchema.parse({ kind: 'soup', soupId: 'miso', servings: 2 })).toEqual({
      kind: 'soup',
      soupId: 'miso',
      servings: 2,
    });
    expect(mealSlotSchema.parse({ kind: 'free' })).toEqual({ kind: 'free' });
    const rejected = mealSlotSchema.safeParse({ kind: 'soup', soupId: 'miso', servings: 5 });
    expect(rejected.error?.issues.map((i) => i.path)).toEqual([['servings']]);
  });
});

describe('buildExport', () => {
  test('produces a valid backup of every table', async () => {
    const exported = await buildExport(db, new Date('2026-10-17T15:00:00Z'));
    expect(() => exportSchema.parse(exported)).not.toThrow();
    expect(exported.exportedAt).toBe('2026-10-17T15:00:00.000Z');
    expect(exported.days).toEqual([day]);
    expect(exported.favorites).toHaveLength(2);
    expect(exported.soupPrefs).toHaveLength(9);
    expect(exported.profile?.schedule.workEnd).toBe('18:30');
  });

  test('a missing profile exports as null', async () => {
    await db.profile.clear();
    expect((await buildExport(db)).profile).toBeNull();
  });
});

describe('downloadExport', () => {
  const originals = {
    createObjectURL: Reflect.get(URL, 'createObjectURL') as unknown,
    revokeObjectURL: Reflect.get(URL, 'revokeObjectURL') as unknown,
  };
  afterEach(() => {
    Object.assign(URL, originals);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('downloads a JSON blob named with the Montevideo date', async () => {
    const blobs: Blob[] = [];
    const revoke = vi.fn();
    Object.assign(URL, {
      createObjectURL: (blob: Blob) => {
        blobs.push(blob);
        return 'blob:weekly';
      },
      revokeObjectURL: revoke,
    });
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
    const exported: WeeklyExport = await buildExport(db);
    vi.useFakeTimers({ toFake: ['setTimeout'] });

    downloadExport(exported, new Date('2026-10-17T02:30:00Z'));

    expect(clicked).toEqual(['weekly-backup-2026-10-16.json']);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:weekly');
    vi.useRealTimers();
    expect(blobs[0]?.type).toBe('application/json');
    expect(JSON.parse(await (blobs[0] as Blob).text())).toEqual(exported);
  });
});
