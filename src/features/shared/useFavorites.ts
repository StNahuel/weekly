import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { FavoriteRecord } from '../../db/types';

export function useFavorites(): FavoriteRecord[] | undefined {
  return useLiveQuery(() => db.favorites.toArray());
}
