import type { MealSlot, SlotFlags } from '../domain/day/slots';
import { applyDayType } from '../domain/day/today';
import type { DayType, MealType } from '../domain/types';
import { db } from './index';
import type { DayRecord, ProfileRecord, SoupPrefRecord } from './types';

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

export async function setFlag(date: string, mealType: MealType, patch: Partial<SlotFlags>): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const day = await db.days.get(date);
    if (!day) throw new Error(`Day ${date} missing`);
    await db.days.put({ ...day, flags: { ...day.flags, [mealType]: { ...day.flags[mealType], ...patch } } });
  });
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
