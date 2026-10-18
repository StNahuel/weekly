import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import { setDayType } from '../../db/repo';
import type { DayRecord } from '../../domain/day/slots';
import type { DayType } from '../../domain/types';
import { BTN_SECONDARY, CARD } from '../../app/ui';
import { defaults } from '../../seed/defaults';
import { DAY_TYPE_TINTS, tintChip } from '../shared/tints';
import { DAY_TYPE_EFFECTS, DAY_TYPE_LABELS } from './labels';

export function DayTypeChip({ day }: { day: DayRecord }) {
  const [open, setOpen] = useState(false);

  const choose = async (dayType: DayType) => {
    setOpen(false);
    if (dayType !== day.dayType) await setDayType(day.date, dayType);
  };

  const tint = DAY_TYPE_TINTS[day.dayType];

  return (
    <section aria-label="Tipo de día" className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <p className={`inline-flex rounded-full px-3 py-1 text-lg font-semibold ${tint.fill} ${tint.ink}`}>{DAY_TYPE_LABELS[day.dayType]}</p>
        <button
          type="button"
          aria-label="Cambiar tipo de día"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={BTN_SECONDARY}
        >
          <Pencil aria-hidden="true" size={20} />
          Cambiar
        </button>
      </div>
      <p className="mt-2 text-muted">{DAY_TYPE_EFFECTS[day.dayType]}</p>
      {open && (
        <div role="group" aria-label="Elegí el tipo de día" className="mt-3 grid gap-2">
          {defaults.interface.activityChoices.map((dayType) => {
            const pressed = dayType === day.dayType;
            return (
              <button
                key={dayType}
                type="button"
                aria-pressed={pressed}
                onClick={() => void choose(dayType)}
                className={`tap flex items-center justify-between rounded-2xl border px-4 text-left transition-colors duration-150 ${tintChip(
                  DAY_TYPE_TINTS[dayType],
                  pressed,
                )}`}
              >
                {DAY_TYPE_LABELS[dayType]}
                {pressed && <Check aria-hidden="true" size={20} />}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
