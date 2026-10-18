import { useId, useState } from 'react';
import { saveProfile } from '../../db/repo';
import type { ProfileRecord } from '../../db/types';
import { defaults } from '../../seed/defaults';
import { ALERT, CARD, FIELD, seedTextEs } from './copy';

type Range = [number, number];
type RangeKey = 'proteinDailyGramsRange' | 'calorieRangeKcal';

const RANGES: readonly { key: RangeKey; title: string; unit: string; min: string; max: string }[] = [
  { key: 'proteinDailyGramsRange', title: 'Proteína diaria', unit: 'g', min: 'Proteína mínima (g)', max: 'Proteína máxima (g)' },
  { key: 'calorieRangeKcal', title: 'Energía diaria', unit: 'kcal', min: 'Calorías mínimas (kcal)', max: 'Calorías máximas (kcal)' },
];

function parseRange([min, max]: readonly [string, string]): Range | null {
  const low = Number(min);
  const high = Number(max);
  if (min === '' || max === '' || !Number.isFinite(low) || !Number.isFinite(high)) return null;
  return low > 0 && low <= high ? [low, high] : null;
}

type RangeFieldsProps = {
  saved: readonly [number, number];
  spec: (typeof RANGES)[number];
  onSave: (key: RangeKey, range: Range) => void;
};

function RangeFields({ saved, spec, onSave }: RangeFieldsProps) {
  const id = useId();
  const [draft, setDraft] = useState<[string, string]>(() => [String(saved[0]), String(saved[1])]);
  const valid = parseRange(draft) !== null;

  const commit = () => {
    const range = parseRange(draft);
    if (range) onSave(spec.key, range);
  };

  const [savedMin, savedMax] = saved;
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">
        {`${spec.title}: `}
        <strong className="text-mint-ink">{`${savedMin}–${savedMax} ${spec.unit}`}</strong>
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {([spec.min, spec.max] as const).map((label, index) => (
          <div key={label} className="space-y-1">
            <label htmlFor={`${id}-${index}`} className="block text-sm text-muted">
              {label}
            </label>
            <input
              id={`${id}-${index}`}
              type="number"
              inputMode="numeric"
              min={1}
              value={draft[index]}
              onChange={(event) =>
                setDraft(index === 0 ? [event.target.value, draft[1]] : [draft[0], event.target.value])
              }
              onBlur={commit}
              className={`${FIELD} w-full`}
            />
          </div>
        ))}
      </div>
      {!valid && <p role="alert" className={`text-sm ${ALERT}`}>Revisá el rango: el mínimo no puede superar al máximo.</p>}
    </fieldset>
  );
}

export function TargetsForm({ profile }: { profile: ProfileRecord }) {
  const headingId = useId();
  const { creatine, whey, magnesium, omega3 } = defaults.nutrition.supplements;
  const [creatineMin, creatineMax] = creatine.gramsPerDayRange;
  const [nutrition, setNutrition] = useState(profile.nutrition);

  const save = (key: RangeKey, range: Range) => {
    const next = { ...nutrition, [key]: range };
    setNutrition(next);
    void saveProfile({ nutrition: next });
  };

  return (
    <section aria-labelledby={headingId} className={`space-y-4 ${CARD}`}>
      <header className="space-y-2">
        <h2 id={headingId} className="text-lg font-semibold">
          Objetivos
        </h2>
        <p className="inline-block rounded-full border border-border px-3 py-1 text-sm text-muted">
          Provisional — sin peso confirmado, no es una indicación médica.
        </p>
      </header>
      {RANGES.map((spec) => (
        <RangeFields key={spec.key} saved={profile.nutrition[spec.key]} spec={spec} onSave={save} />
      ))}
      <section aria-label="Suplementos" className="space-y-1 border-t border-border pt-3 text-sm text-muted">
        <h3 className="font-semibold text-text">Suplementos (solo información)</h3>
        <p>{`Creatina: ${creatineMin}–${creatineMax} g por día.`}</p>
        <p>{`Proteína whey: ${seedTextEs(whey.use)}`}</p>
        <p>{`Magnesio: ${seedTextEs(magnesium.note)}`}</p>
        <p>{`Omega-3: ${seedTextEs(omega3.note)}`}</p>
      </section>
    </section>
  );
}
