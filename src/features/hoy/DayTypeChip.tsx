import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import { setDayType } from '../../db/repo';
import type { DayRecord } from '../../domain/day/slots';
import type { DayType } from '../../domain/types';
import { defaults } from '../../seed/defaults';
import { DAY_TYPE_EFFECTS, DAY_TYPE_LABELS } from './labels';

export function DayTypeChip({ day }: { day: DayRecord }) {
  const [open, setOpen] = useState(false);

  const choose = async (dayType: DayType) => {
    setOpen(false);
    if (dayType !== day.dayType) await setDayType(day.date, dayType);
  };

  return (
    <section aria-label="Tipo de día" className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold text-sage">{DAY_TYPE_LABELS[day.dayType]}</p>
        <button
          type="button"
          aria-label="Cambiar tipo de día"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="tap inline-flex items-center gap-2 rounded-xl border border-border px-3 font-semibold"
        >
          <Pencil aria-hidden="true" size={20} />
          Cambiar
        </button>
      </div>
      <p className="mt-1 text-muted">{DAY_TYPE_EFFECTS[day.dayType]}</p>
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
                className={`tap flex items-center justify-between rounded-xl border px-4 text-left ${
                  pressed ? 'border-sage font-semibold text-sage' : 'border-border'
                }`}
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
