import { Check } from 'lucide-react';
import { useState } from 'react';
import { upsertDay } from '../../db/repo';
import { suggestSlots, type DietaryExclusions } from '../../domain/day/slots';
import type { DaySuggestion } from '../../domain/day/today';
import type { SoupIngredientIds } from '../../domain/meals/filters';
import type { DayType } from '../../domain/types';
import { defaults } from '../../seed/defaults';
import { SLOT_CATALOGS } from '../shared/slotCatalogs';
import { DAY_TYPE_LABELS } from './labels';

type DayTypePromptProps = {
  dateKey: string;
  suggestion: DaySuggestion;
  dietary: DietaryExclusions;
  soupIngredientIds: SoupIngredientIds;
};

export function DayTypePrompt({ dateKey, suggestion, dietary, soupIngredientIds }: DayTypePromptProps) {
  const [chosen, setChosen] = useState<DayType>(suggestion.dayType);
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    try {
      await upsertDay({
        date: dateKey,
        dayType: chosen,
        flexible: suggestion.flexible && chosen === suggestion.dayType,
        slots: suggestSlots(chosen, SLOT_CATALOGS, Math.random, dietary, soupIngredientIds),
        confirmedAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="day-type-heading" className="rounded-2xl border border-border bg-surface p-4">
      <h2 id="day-type-heading" className="text-lg font-semibold">
        ¿Qué tipo de día vas a tener?
      </h2>
      {suggestion.flexible && <p className="mt-2 text-gold">Sábado flexible: elegí lo que venga</p>}
      <div role="group" aria-label="Tipo de día" className="mt-4 grid gap-2">
        {defaults.interface.activityChoices.map((dayType) => {
          const pressed = dayType === chosen;
          return (
            <button
              key={dayType}
              type="button"
              aria-pressed={pressed}
              onClick={() => setChosen(dayType)}
              className={`tap flex items-center justify-between rounded-xl border px-4 text-left ${
                pressed ? 'border-sage bg-surface-2 font-semibold text-sage' : 'border-border text-text'
              }`}
            >
              {DAY_TYPE_LABELS[dayType]}
              {pressed && <Check aria-hidden="true" size={20} />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={saving}
        className="tap mt-4 w-full rounded-xl bg-sage px-4 font-semibold text-bg disabled:opacity-60"
      >
        Confirmar
      </button>
    </section>
  );
}
