import { describe, expect, test } from 'vitest';
import { defaults } from '../../seed/defaults';
import { applyDayType, localDateKey, suggestDayType, weekdayKey } from './today';
import type { DayRecord } from './slots';

const template = defaults.schedule.template;

describe('local date in Montevideo', () => {
  test('23:30 Friday local is still Friday even though UTC is Saturday', () => {
    const now = new Date('2026-10-17T02:30:00Z');
    expect(localDateKey(now)).toBe('2026-10-16');
    expect(weekdayKey(now)).toBe('friday');
  });

  test('an hour later local midnight rolls over', () => {
    const now = new Date('2026-10-17T03:30:00Z');
    expect(localDateKey(now)).toBe('2026-10-17');
    expect(weekdayKey(now)).toBe('saturday');
  });

  test('the time zone is a parameter', () => {
    const now = new Date('2026-10-17T02:30:00Z');
    expect(localDateKey(now, 'UTC')).toBe('2026-10-17');
    expect(weekdayKey(now, 'UTC')).toBe('saturday');
  });
});

describe('suggestDayType', () => {
  test('flexible Saturday preselects rest and keeps the flexible flag', () => {
    expect(suggestDayType(template, 'saturday')).toEqual({ dayType: 'rest', flexible: true });
  });

  test('fixed days come straight from the template', () => {
    expect(suggestDayType(template, 'tuesday')).toEqual({ dayType: 'boxing', flexible: false });
    expect(suggestDayType(template, 'sunday')).toEqual({ dayType: 'rest', flexible: false });
  });
});

describe('applyDayType', () => {
  test('changes the day type and keeps the chosen slots', () => {
    const day: DayRecord = {
      date: '2026-10-16',
      dayType: 'strength',
      flexible: false,
      slots: {
        breakfast: { kind: 'template', templateId: 'oats_whey' },
        lunch: { kind: 'combo', proteinId: 'salmon', sideId: 'rice_broccoli' },
        snack: { kind: 'skip' },
        dinner: { kind: 'social', social: 'friends' },
      },
      confirmedAt: '2026-10-16T12:00:00Z',
    };
    const busy = applyDayType(day, 'busy');
    expect(busy.dayType).toBe('busy');
    expect(busy.slots).toBe(day.slots);
    expect(day.dayType).toBe('strength');
  });
});
