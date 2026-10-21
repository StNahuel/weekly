import { useMemo, useState } from 'react';
import { setSlot } from '../../db/repo';
import type { ProfileRecord } from '../../db/types';
import { localTimeKey } from '../../domain/day/today';
import type { DayRecord } from '../../domain/day/slots';
import type { MealContext } from '../../domain/meals/resolveSlot';
import type { DayProjection } from '../../domain/nutrition/projectDay';
import {
  applyProposal,
  proposeAdjustment,
  type Proposal,
  type UnresolvedReason,
} from '../../domain/nutrition/proposeAdjustment';
import type { MealType } from '../../domain/types';
import { defaults } from '../../seed/defaults';

export type RebalanceResult = Proposal | { unresolved: UnresolvedReason };

type Change = { date: string; mealType: MealType; now: string };

export type Rebalance = {
  changedMealType: MealType | null;
  result: RebalanceResult | null;
  markChanged: (mealType: MealType) => void;
  apply: () => Promise<void>;
  dismiss: () => void;
};

export const TOLERANCE_KCAL = defaults.interface.rebalancing.toleranceKcal;

export function useRebalance(
  day: DayRecord,
  projection: DayProjection,
  ctx: MealContext,
  profile: ProfileRecord,
): Rebalance {
  const [change, setChange] = useState<Change | null>(null);
  const target = profile.nutrition.dailyCalorieTargetKcal;
  const mealTimes = profile.schedule.meals;
  const active = change !== null && change.date === day.date ? change : null;

  const result = useMemo(() => {
    if (!active || Math.abs(target - projection.total.kcal) <= TOLERANCE_KCAL) return null;
    return proposeAdjustment(
      day,
      projection,
      { target, tolerance: TOLERANCE_KCAL, now: active.now, mealTimes, changedMealType: active.mealType },
      ctx.catalog,
    );
  }, [active, day, projection, target, mealTimes, ctx]);

  return {
    changedMealType: active?.mealType ?? null,
    result,
    markChanged: (mealType) => setChange({ date: day.date, mealType, now: localTimeKey(new Date()) }),
    apply: async () => {
      if (!result || 'unresolved' in result) return;
      const next = applyProposal(day, result, ctx.templates);
      await setSlot(day.date, result.mealType, next.slots[result.mealType]);
      setChange(null);
    },
    dismiss: () => setChange(null),
  };
}
