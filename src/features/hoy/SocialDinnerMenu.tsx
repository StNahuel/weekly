import { db } from '../../db';
import { setSlot } from '../../db/repo';
import type { MealSlot } from '../../domain/day/slots';
import type { SoupIngredientIds } from '../../domain/meals/filters';
import { SOCIAL_KINDS, type DayType, type SocialKind } from '../../domain/types';
import type { Dietary } from '../shared/candidates';
import { SOCIAL_LABELS } from './labels';
import { nextSlot } from './reshuffle';
import { isRestorable, lastDinnerKey } from './socialDinner';

type SocialDinnerMenuProps = {
  date: string;
  slot: MealSlot;
  dayType: DayType;
  dietary: Dietary;
  soupIngredientIds: SoupIngredientIds;
};

export function SocialDinnerMenu({ date, slot, dayType, dietary, soupIngredientIds }: SocialDinnerMenuProps) {
  const chooseSocial = (social: SocialKind) =>
    db.transaction('rw', db.days, db.meta, async () => {
      if (slot.kind !== 'social') await db.meta.put({ key: lastDinnerKey(date), value: slot });
      await setSlot(date, 'dinner', { kind: 'social', social });
    });

  const choosePlan = () =>
    db.transaction('rw', db.days, db.meta, async () => {
      if (slot.kind !== 'social') return;
      const saved = (await db.meta.get(lastDinnerKey(date)))?.value;
      await setSlot(date, 'dinner', isRestorable(saved) ? saved : nextSlot('dinner', slot, dayType, dietary, soupIngredientIds));
      await db.meta.delete(lastDinnerKey(date));
    });

  const option = (label: string, pressed: boolean, onClick: () => Promise<void>) => (
    <button
      key={label}
      type="button"
      aria-pressed={pressed}
      onClick={() => void onClick()}
      className={`tap rounded-lg px-2 text-sm font-semibold ${pressed ? 'bg-surface-2 text-sage' : 'text-muted'}`}
    >
      {label}
    </button>
  );

  return (
    <div role="group" aria-label="Cena social" className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-border p-1">
      {option('Plan normal', slot.kind !== 'social', choosePlan)}
      {SOCIAL_KINDS.map((social) =>
        option(SOCIAL_LABELS[social], slot.kind === 'social' && slot.social === social, () => chooseSocial(social)),
      )}
    </div>
  );
}
