import { db } from '../../db';
import type { DayRecord, DaySlots } from '../../domain/day/slots';
import type { DayType } from '../../domain/types';

export const EMPTY_SLOTS: DaySlots = {
  breakfast: { kind: 'empty' },
  lunch: { kind: 'empty' },
  snack: { kind: 'empty' },
  dinner: { kind: 'empty' },
};

export async function putDay(date: string, dayType: DayType, slots: Partial<DaySlots> = {}): Promise<DayRecord> {
  const day: DayRecord = {
    date,
    dayType,
    flexible: false,
    slots: { ...EMPTY_SLOTS, ...slots },
    confirmedAt: `${date}T12:00:00Z`,
  };
  await db.days.put(day);
  return day;
}
