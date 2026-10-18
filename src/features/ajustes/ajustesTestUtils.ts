import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import type { ProfileRecord } from '../../db/types';
import { seeds } from '../../seed';
import { clearDb, getProfile } from '../../test/db';

export async function freshProfile(): Promise<ProfileRecord> {
  await clearDb();
  await hydrate(db, seeds);
  const profile = await getProfile();
  if (!profile) throw new Error('profile missing');
  return profile;
}
