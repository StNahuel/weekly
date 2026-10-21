import type { DayRecord } from '../domain/day/slots';
import type { Schedule } from '../domain/schemas/defaults.schema';
import type { SoupOptions } from '../domain/soups/types';

export type { DayRecord };

export type ProfileRecord = {
  id: 'me';
  schedule: Schedule;
  nutrition: {
    proteinDailyGramsRange: [number, number];
    calorieRangeKcal: [number, number];
    dailyCalorieTargetKcal: number;
    provisional: true;
  };
  dietary: { excludedIngredientIds: string[]; notes: string };
  device: { largeText: boolean };
  onboardingCompletedAt?: string;
  updatedAt: string;
};

type Flatten<T> = { [K in keyof T]: T[K] };

export type SoupPrefRecord = Flatten<{ recipeId: string } & Omit<SoupOptions, 'servings'>>;

export type MetaRecord = { key: string; value: unknown };
