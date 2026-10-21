import { useMemo } from 'react';
import type { DayRecord } from '../../domain/day/slots';
import type { MealContext } from '../../domain/meals/resolveSlot';
import { projectDay, type DayProjection } from '../../domain/nutrition/projectDay';

export function useDayProjection(day: Pick<DayRecord, 'slots'>, ctx: MealContext): DayProjection {
  return useMemo(() => projectDay(day, ctx), [day, ctx]);
}
