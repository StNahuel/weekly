import type { Seeds } from '../seed';
import { brothTypeFromDefault } from '../seed/soups';
import type { WeeklyDB } from './index';
import type { ProfileRecord } from './types';

export function profileFromSeeds({ defaults }: Seeds, now: string): ProfileRecord {
  const [proteinMin, proteinMax] = defaults.nutrition.proteinDailyGramsRange;
  const [kcalMin, kcalMax] = defaults.nutrition.calorieRangeKcalInitiallySuggested;
  return {
    id: 'me',
    schedule: structuredClone(defaults.schedule),
    nutrition: {
      proteinDailyGramsRange: [proteinMin, proteinMax],
      calorieRangeKcal: [kcalMin, kcalMax],
      dailyCalorieTargetKcal: defaults.nutrition.dailyCalorieTargetKcal,
      provisional: true,
    },
    dietary: { excludedIngredientIds: [], notes: '' },
    device: { largeText: false },
    updatedAt: now,
  };
}

export async function hydrate(db: WeeklyDB, seeds: Seeds): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.profile, db.soupPrefs, db.meta], async () => {
    if (!(await db.profile.get('me'))) await db.profile.add(profileFromSeeds(seeds, now));

    for (const recipe of seeds.soups.recipes) {
      if (await db.soupPrefs.get(recipe.id)) continue;
      await db.soupPrefs.add({
        recipeId: recipe.id,
        brothType: brothTypeFromDefault(recipe.broth.defaultType),
        thaiLegume: recipe.options.thaiLegume?.default ?? 'none',
      });
    }

    await db.meta.put({ key: 'seedVersion', value: seeds.foods.schemaVersion });
  });
}
