import { savePlan } from '../../db/repo';
import type { ShoppingPlanRecord } from '../../db/types';
import type { PlannedMeal } from '../../domain/shopping/planLines';

export async function putPlan(meals: PlannedMeal[], patch: Partial<ShoppingPlanRecord> = {}): Promise<ShoppingPlanRecord> {
  const plan: ShoppingPlanRecord = {
    id: 'current',
    startDate: '2026-10-16',
    horizonDays: 3,
    meals,
    checkedKeys: [],
    removedKeys: [],
    overrides: {},
    updatedAt: '2026-10-16T12:00:00.000Z',
    ...patch,
  };
  await savePlan(plan);
  return plan;
}
