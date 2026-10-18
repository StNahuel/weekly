import { defaults } from '../../seed/defaults';
import { suggestDayType, type WeeklyTemplate } from '../day/today';
import { WEEKDAYS, type DayType, type Weekday } from '../types';

export const horizonOptions: readonly number[] = defaults.shopping.horizonDaysOptions;
export const defaultHorizonDays = defaults.shopping.defaultHorizonDays;

export type PlanDay = { date: string; weekday: Weekday; suggestedDayType: DayType; flexible: boolean };

export function clampHorizon(n?: number): number {
  if (n === undefined || !Number.isFinite(n)) return defaultHorizonDays;
  return horizonOptions.reduce((best, option) => (Math.abs(option - n) < Math.abs(best - n) ? option : best));
}

// Day-number arithmetic keeps plan dates out of time-zone math.
function daysFromCivil(y: number, m: number, d: number): number {
  const year = m <= 2 ? y - 1 : y;
  const era = Math.floor(year / 400);
  const yoe = year - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(days: number): string {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDateKey(key: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid date key "${key}"`);
  const days = daysFromCivil(Number(match[1]), Number(match[2]), Number(match[3]));
  if (civilFromDays(days) !== key) throw new Error(`Invalid date key "${key}"`);
  return days;
}

function weekdayOf(days: number): Weekday {
  // 1970-01-01 (day 0) was a Thursday.
  const weekday = WEEKDAYS[(((days + 3) % 7) + 7) % 7];
  if (!weekday) throw new Error(`No weekday for day ${days}`);
  return weekday;
}

export function buildPlanDays(startKey: string, horizonDays: number, template: WeeklyTemplate): PlanDay[] {
  const start = parseDateKey(startKey);
  return Array.from({ length: horizonDays }, (_, i) => {
    const weekday = weekdayOf(start + i);
    const { dayType, flexible } = suggestDayType(template, weekday);
    return { date: civilFromDays(start + i), weekday, suggestedDayType: dayType, flexible };
  });
}
