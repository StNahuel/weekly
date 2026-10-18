import type { DayRecord } from '../domain/day/slots';
import type { Schedule } from '../domain/schemas/defaults.schema';
import type { PlannedMeal } from '../domain/shopping/planLines';
import type { SoupOptions } from '../domain/soups/types';

export type { DayRecord };

export type ProfileRecord = {
  id: 'me';
  schedule: Schedule;
  nutrition: {
    proteinDailyGramsRange: [number, number];
    calorieRangeKcal: [number, number];
    provisional: true;
  };
  dietary: { excludedIngredientIds: string[]; excludedTags: string[]; notes: string };
  device: { largeText: boolean };
  onboardingCompletedAt?: string;
  updatedAt: string;
};

export type FavoriteRecord = {
  id: string;
  proteinId: string;
  sideId: string;
  title: string;
  source: 'seed' | 'user';
  createdAt: string;
};

type Flatten<T> = { [K in keyof T]: T[K] };

export type SoupPrefRecord = Flatten<{ recipeId: string } & Omit<SoupOptions, 'servings'>>;

export type ShoppingPlanRecord = {
  id: 'current';
  startDate: string;
  horizonDays: number;
  meals: PlannedMeal[];
  checkedKeys: string[];
  removedKeys: string[];
  overrides: Record<string, number>;
  updatedAt: string;
};

export type MetaRecord = { key: string; value: unknown };
