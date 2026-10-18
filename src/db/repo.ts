import type { MealSlot } from '../domain/day/slots';
import { applyDayType } from '../domain/day/today';
import type { DayType, MealType } from '../domain/types';
import { db } from './index';
import type { DayRecord, FavoriteRecord, ProfileRecord, ShoppingPlanRecord, SoupPrefRecord } from './types';

export type ProfilePatch = Partial<Omit<ProfileRecord, 'id' | 'updatedAt'>>;

export type SoupPrefsPatch = Partial<Pick<SoupPrefRecord, 'brothType' | 'thaiLegume'>> & {
  boneBrothGramsFor3?: number | undefined;
  concentrateGramsFor3?: number | undefined;
};

export async function saveProfile(patch: ProfilePatch): Promise<void> {
  const updated = await db.profile.update('me', { ...patch, updatedAt: new Date().toISOString() });
  if (updated === 0) throw new Error('Profile missing; hydrate first');
}

export async function upsertDay(day: DayRecord): Promise<void> {
  await db.days.put(day);
}

export async function setDayType(date: string, dayType: DayType): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const day = await db.days.get(date);
    if (!day) throw new Error(`Day ${date} missing`);
    await db.days.put({ ...applyDayType(day, dayType), flexible: false });
  });
}

export async function setSlot(date: string, mealType: MealType, slot: MealSlot): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const day = await db.days.get(date);
    if (!day) throw new Error(`Day ${date} missing`);
    await db.days.put({ ...day, slots: { ...day.slots, [mealType]: slot } });
  });
}

export async function addFavorite(proteinId: string, sideId: string, title: string): Promise<FavoriteRecord> {
  return db.transaction('rw', db.favorites, async () => {
    const existing = await db.favorites
      .where('proteinId')
      .equals(proteinId)
      .filter((f) => f.sideId === sideId)
      .first();
    if (existing) return existing;
    const favorite: FavoriteRecord = {
      id: `fav_user_${proteinId}_${sideId}`,
      proteinId,
      sideId,
      title,
      source: 'user',
      createdAt: new Date().toISOString(),
    };
    await db.favorites.add(favorite);
    return favorite;
  });
}

export async function removeFavorite(id: string): Promise<void> {
  await db.favorites.delete(id);
}

const OVERRIDE_KEYS = ['boneBrothGramsFor3', 'concentrateGramsFor3'] as const;

// An undefined override deletes the stored value, restoring the recipe default.
export async function saveSoupPrefs(recipeId: string, patch: SoupPrefsPatch): Promise<void> {
  const updated = await db.soupPrefs.update(recipeId, (prefs) => {
    if (patch.brothType) prefs.brothType = patch.brothType;
    if (patch.thaiLegume) prefs.thaiLegume = patch.thaiLegume;
    for (const key of OVERRIDE_KEYS) {
      if (!(key in patch)) continue;
      const value = patch[key];
      if (value === undefined) delete prefs[key];
      else prefs[key] = value;
    }
  });
  if (updated === 0) throw new Error(`Soup prefs for ${recipeId} missing`);
}

export async function savePlan(plan: ShoppingPlanRecord): Promise<void> {
  await db.shoppingPlans.put({ ...plan, updatedAt: new Date().toISOString() });
}

async function updatePlan(change: (plan: ShoppingPlanRecord) => Partial<ShoppingPlanRecord>): Promise<ShoppingPlanRecord> {
  return db.transaction('rw', db.shoppingPlans, async () => {
    const plan = await db.shoppingPlans.get('current');
    if (!plan) throw new Error('Shopping plan missing');
    const next = { ...plan, ...change(plan), updatedAt: new Date().toISOString() };
    await db.shoppingPlans.put(next);
    return next;
  });
}

export async function toggleChecked(key: string): Promise<string[]> {
  const plan = await updatePlan(({ checkedKeys }) => ({
    checkedKeys: checkedKeys.includes(key) ? checkedKeys.filter((k) => k !== key) : [...checkedKeys, key],
  }));
  return plan.checkedKeys;
}

export async function resetChecked(): Promise<void> {
  await updatePlan(() => ({ checkedKeys: [] }));
}

export async function setPlanMeal(index: number, slot: MealSlot): Promise<void> {
  await updatePlan(({ meals }) => {
    if (!meals[index]) throw new Error(`Planned meal ${index} missing`);
    return { meals: meals.map((meal, i) => (i === index ? { ...meal, slot } : meal)) };
  });
}

export async function removeGroceryItem(key: string): Promise<void> {
  await updatePlan(({ removedKeys }) => ({ removedKeys: removedKeys.includes(key) ? removedKeys : [...removedKeys, key] }));
}

export async function restoreGroceryItems(): Promise<void> {
  await updatePlan(() => ({ removedKeys: [] }));
}

// An undefined amount drops the override, restoring the computed grams.
export async function setGroceryOverride(key: string, grams: number | undefined): Promise<void> {
  await updatePlan(({ overrides }) => {
    const next = { ...overrides };
    if (grams === undefined) delete next[key];
    else next[key] = grams;
    return { overrides: next };
  });
}
