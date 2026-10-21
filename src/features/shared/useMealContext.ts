import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../../db';
import type { MealContext } from '../../domain/meals/resolveSlot';
import { buildMealContext } from './mealContext';

export function useMealContext(): MealContext | undefined {
  const prefs = useLiveQuery(() => db.soupPrefs.toArray());
  return useMemo(() => (prefs ? buildMealContext(prefs) : undefined), [prefs]);
}
