import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useProfile } from '../../app/useProfile';
import { db } from '../../db';
import { localDateKey, suggestDayType, weekdayKey, type DaySuggestion } from '../../domain/day/today';
import type { DayRecord } from '../../domain/day/slots';
import type { Weekday } from '../../domain/types';
import { defaults } from '../../seed/defaults';

export const DATE_CHECK_INTERVAL_MS = 60_000;

type Today = { dateKey: string; weekday: Weekday };

export type TodayState = {
  dateKey: string;
  day: DayRecord | null | undefined;
  suggestion: DaySuggestion | undefined;
};

function readToday(tz: string): Today {
  const now = new Date();
  return { dateKey: localDateKey(now, tz), weekday: weekdayKey(now, tz) };
}

export function useToday(): TodayState {
  const tz = defaults.timezone;
  const [today, setToday] = useState(() => readToday(tz));

  useEffect(() => {
    const update = () =>
      setToday((previous) => {
        const next = readToday(tz);
        return next.dateKey === previous.dateKey ? previous : next;
      });
    const interval = setInterval(update, DATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, [tz]);

  const loaded = useLiveQuery(
    async () => ({ dateKey: today.dateKey, day: (await db.days.get(today.dateKey)) ?? null }),
    [today.dateKey],
  );
  const profile = useProfile();
  return {
    dateKey: today.dateKey,
    day: loaded?.dateKey === today.dateKey ? loaded.day : undefined,
    suggestion: profile ? suggestDayType(profile.schedule.template, today.weekday) : undefined,
  };
}
