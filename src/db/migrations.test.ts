import { expect, test } from 'vitest';
import type { DayRecord } from '../domain/day/slots';
import { WeeklyDB } from './index';

const day: DayRecord = {
  date: '2026-10-16',
  dayType: 'boxing',
  flexible: false,
  slots: {
    breakfast: { kind: 'empty' },
    lunch: { kind: 'empty' },
    snack: { kind: 'empty' },
    dinner: { kind: 'social', social: 'friends' },
  },
  confirmedAt: '2026-10-16T12:00:00.000Z',
};

class WeeklyDBv2 extends WeeklyDB {
  constructor(name: string) {
    super(name);
    this.version(2).upgrade((tx) =>
      tx
        .table('days')
        .toCollection()
        .modify((d: Record<string, unknown>) => {
          d.migrated = true;
        }),
    );
  }
}

test('an upgrade keeps existing rows', async () => {
  const v1 = new WeeklyDB('migration-test');
  await v1.days.put(day);
  v1.close();

  const v2 = new WeeklyDBv2('migration-test');
  const read = (await v2.days.get(day.date)) as (DayRecord & { migrated?: boolean }) | undefined;
  expect(v2.verno).toBe(2);
  expect(read?.date).toBe('2026-10-16');
  expect(read?.slots.dinner).toEqual({ kind: 'social', social: 'friends' });
  expect(read?.migrated).toBe(true);
  v2.close();
});
