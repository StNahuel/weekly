import { describe, expect, test } from 'vitest';
import { defaults } from '../../seed/defaults';
import { buildPlanDays, clampHorizon, horizonOptions } from './horizon';

const template = defaults.schedule.template;

describe('clampHorizon', () => {
  test('options and default come from the seed', () => {
    expect(horizonOptions).toEqual([3, 4, 5, 6, 7]);
    expect(clampHorizon(undefined)).toBe(5);
    expect(clampHorizon(Number.NaN)).toBe(5);
  });

  test('snaps to the nearest allowed horizon', () => {
    expect(clampHorizon(9)).toBe(7);
    expect(clampHorizon(1)).toBe(3);
    expect(clampHorizon(4)).toBe(4);
    expect(clampHorizon(5.4)).toBe(5);
  });
});

describe('buildPlanDays', () => {
  test('five days from Friday follow the weekly template', () => {
    const days = buildPlanDays('2026-10-16', 5, template);
    expect(days).toEqual([
      { date: '2026-10-16', weekday: 'friday', suggestedDayType: 'strength', flexible: false },
      { date: '2026-10-17', weekday: 'saturday', suggestedDayType: 'rest', flexible: true },
      { date: '2026-10-18', weekday: 'sunday', suggestedDayType: 'rest', flexible: false },
      { date: '2026-10-19', weekday: 'monday', suggestedDayType: 'strength', flexible: false },
      { date: '2026-10-20', weekday: 'tuesday', suggestedDayType: 'boxing', flexible: false },
    ]);
  });

  test('crosses month, year and leap-day boundaries', () => {
    expect(buildPlanDays('2026-12-30', 3, template).map((d) => [d.date, d.weekday])).toEqual([
      ['2026-12-30', 'wednesday'],
      ['2026-12-31', 'thursday'],
      ['2027-01-01', 'friday'],
    ]);
    expect(buildPlanDays('2028-02-28', 2, template).map((d) => d.date)).toEqual(['2028-02-28', '2028-02-29']);
  });

  test('rejects malformed or impossible dates', () => {
    expect(() => buildPlanDays('2026-02-30', 3, template)).toThrow('Invalid date key "2026-02-30"');
    expect(() => buildPlanDays('16/10/2026', 3, template)).toThrow('Invalid date key "16/10/2026"');
  });
});
