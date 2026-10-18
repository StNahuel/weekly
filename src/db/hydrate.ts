import type { Seeds } from '../seed';
import { brothTypeFromDefault } from '../seed/soups';
import type { WeeklyDB } from './index';
import type { ProfileRecord } from './types';

export const HYDRATED_FAVORITES_KEY = 'hydratedSeedFavoriteIds';

export function profileFromSeeds({ defaults }: Seeds, now: string): ProfileRecord {
  const [proteinMin, proteinMax] = defaults.nutrition.proteinDailyGramsRange;
  const [kcalMin, kcalMax] = defaults.nutrition.calorieRangeKcalInitiallySuggested;
  return {
    id: 'me',
    schedule: structuredClone(defaults.schedule),
    nutrition: { proteinDailyGramsRange: [proteinMin, proteinMax], calorieRangeKcal: [kcalMin, kcalMax], provisional: true },
    dietary: { excludedIngredientIds: [], excludedTags: [], notes: '' },
    device: { largeText: false },
    updatedAt: now,
  };
}

export async function hydrate(db: WeeklyDB, seeds: Seeds): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.profile, db.favorites, db.soupPrefs, db.meta], async () => {
    if (!(await db.profile.get('me'))) await db.profile.add(profileFromSeeds(seeds, now));

    const meta = await db.meta.get(HYDRATED_FAVORITES_KEY);
    const hydrated = new Set(Array.isArray(meta?.value) ? meta.value.map(String) : []);
    for (const combo of seeds.foods.favoriteCombos) {
      if (hydrated.has(combo.id)) continue;
      if (!(await db.favorites.get(combo.id))) {
        const { id, proteinId, sideId, title } = combo;
        await db.favorites.add({ id, proteinId, sideId, title, source: 'seed', createdAt: now });
      }
      hydrated.add(combo.id);
    }
    await db.meta.put({ key: HYDRATED_FAVORITES_KEY, value: [...hydrated] });

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
