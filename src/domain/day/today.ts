import { WEEKDAYS, type DayType, type TemplateDay, type Weekday } from '../types';

export const APP_TIME_ZONE = 'America/Montevideo';

export type WeeklyTemplate = Readonly<Record<Weekday, TemplateDay>>;

export type DaySuggestion = { dayType: DayType; flexible: boolean };

export function localDateKey(now: Date, tz: string = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    now,
  );
}

export function weekdayKey(now: Date, tz: string = APP_TIME_ZONE): Weekday {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now).toLowerCase();
  const weekday = WEEKDAYS.find((w) => w === name);
  if (!weekday) throw new Error(`Unexpected weekday "${name}"`);
  return weekday;
}

export function suggestDayType(template: WeeklyTemplate, weekday: Weekday): DaySuggestion {
  const day = template[weekday];
  return day === 'flexible' ? { dayType: 'rest', flexible: true } : { dayType: day, flexible: false };
}

export function applyDayType<T extends { dayType: DayType }>(day: T, dayType: DayType): T {
  return { ...day, dayType };
}
