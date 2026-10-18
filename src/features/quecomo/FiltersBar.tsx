import { Star, Timer } from 'lucide-react';
import { defaults } from '../../seed/defaults';
import type { ComboFilters } from '../shared/candidates';
import { DAY_TYPE_LABELS } from '../hoy/labels';

const TIME_OPTIONS = [15, 30, 45] as const;

type FiltersBarProps = { filters: ComboFilters; onChange: (filters: ComboFilters) => void };

const chip = (pressed: boolean) =>
  `tap inline-flex items-center gap-2 rounded-full border px-3 text-sm font-semibold ${
    pressed ? 'border-sage bg-surface-2 text-sage' : 'border-border text-muted'
  }`;

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  const setTime = (value: string) =>
    onChange(
      value === ''
        ? { dayType: filters.dayType, favoritesOnly: filters.favoritesOnly }
        : { ...filters, maxPrepMinutes: Number(value) },
    );

  return (
    <section aria-label="Filtros" className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div role="group" aria-label="Tipo de día" className="flex flex-wrap gap-2">
        {defaults.interface.activityChoices.map((dayType) => (
          <button
            key={dayType}
            type="button"
            aria-pressed={filters.dayType === dayType}
            onClick={() => onChange({ ...filters, dayType })}
            className={chip(filters.dayType === dayType)}
          >
            {DAY_TYPE_LABELS[dayType]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <Timer aria-hidden="true" size={20} className="text-muted" />
          <span>Tiempo disponible</span>
          <select
            value={filters.maxPrepMinutes ?? ''}
            onChange={(event) => setTime(event.target.value)}
            className="tap rounded-xl border border-border bg-surface-2 px-3 text-text"
          >
            {TIME_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>{`${minutes} min`}</option>
            ))}
            <option value="">Sin límite</option>
          </select>
        </label>
        <button
          type="button"
          aria-pressed={filters.favoritesOnly}
          onClick={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
          className={chip(filters.favoritesOnly)}
        >
          <Star aria-hidden="true" size={20} />
          Solo favoritos
        </button>
      </div>
    </section>
  );
}
