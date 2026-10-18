import { Check } from 'lucide-react';
import { useState } from 'react';
import { upsertDay } from '../../db/repo';
import { suggestSlots, type DietaryExclusions } from '../../domain/day/slots';
import type { DaySuggestion } from '../../domain/day/today';
import type { SoupIngredientIds } from '../../domain/meals/filters';
import type { DayType } from '../../domain/types';
import { BTN_PRIMARY, CARD } from '../../app/ui';
import { defaults } from '../../seed/defaults';
import { SLOT_CATALOGS } from '../shared/slotCatalogs';
import { DAY_TYPE_TINTS, tintChip } from '../shared/tints';
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
    <section aria-labelledby="day-type-heading" className={CARD}>
      <h2 id="day-type-heading" className="text-lg font-semibold">
        ¿Qué tipo de día vas a tener?
      </h2>
      {suggestion.flexible && <p className="mt-2 inline-block rounded-full bg-peach px-3 py-0.5 font-semibold text-peach-ink">Sábado flexible: elegí lo que venga</p>}
      <div role="group" aria-label="Tipo de día" className="mt-4 grid gap-2">
        {defaults.interface.activityChoices.map((dayType) => {
          const pressed = dayType === chosen;
          return (
            <button
              key={dayType}
              type="button"
              aria-pressed={pressed}
              onClick={() => setChosen(dayType)}
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
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={saving}
        className={`${BTN_PRIMARY} mt-4 w-full`}
      >
        Confirmar
      </button>
    </section>
  );
}
