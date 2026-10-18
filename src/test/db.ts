import { db } from '../db';
import type { DayRecord, FavoriteRecord, ProfileRecord, ShoppingPlanRecord, SoupPrefRecord } from '../db/types';

export async function clearDb(): Promise<void> {
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((t) => t.clear())));
}

export function getProfile(): Promise<ProfileRecord | undefined> {
  return db.profile.get('me');
}

export function getDay(date: string): Promise<DayRecord | undefined> {
  return db.days.get(date);
}

export function listFavorites(): Promise<FavoriteRecord[]> {
  return db.favorites.toArray();
}

export function getSoupPrefs(recipeId: string): Promise<SoupPrefRecord | undefined> {
  return db.soupPrefs.get(recipeId);
}

export function getPlan(): Promise<ShoppingPlanRecord | undefined> {
  return db.shoppingPlans.get('current');
}
