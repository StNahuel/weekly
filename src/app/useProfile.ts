import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { ProfileRecord } from '../db/types';

export function useProfile(): ProfileRecord | undefined {
  return useLiveQuery(() => db.profile.get('me'));
}
