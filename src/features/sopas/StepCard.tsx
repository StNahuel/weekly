import { Check, Gauge, Repeat, Thermometer, Timer, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { CALLOUT, CARD, SECTION_LABEL } from '../../app/ui';
import { formatDuration, formatGrams } from '../../domain/format';
import type { Controls } from '../../domain/schemas/soups.schema';
import type { ResolvedStep } from '../../domain/soups/types';
import { TINTS, type Tint } from '../shared/tints';
import { SafetyBanner } from './SafetyBanner';

export const NO_NEW_INGREDIENTS = 'Sin ingredientes nuevos en este paso';

const speedFormat = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 });

function temperatureText({ temperatureCRange: range, heatOff }: Controls): string | null {
  if (heatOff) return 'Sin calor';
  if (!range) return null;
  const [min, max] = range;
  return min === max ? `${min} °C` : `${min}–${max} °C`;
}

function speedText({ speed }: Controls): string {
  switch (speed.mode) {
    case 'numeric':
      return `Vel. ${speedFormat.format(speed.value)}`;
    case 'gradual':
      return `Subir gradualmente hasta vel. ${speedFormat.format(speed.maxValue)}`;
    case 'manual':
      return 'Mezclar a mano / sin programa';
  }
}

function Chip({ icon, tint, children }: { icon: ReactNode; tint: Tint; children: string }) {
  return (
    <li className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-lg font-semibold ${tint.fill} ${tint.ink}`}>
      {icon}
      {children}
    </li>
  );
}

type StepCardProps = {
  step: ResolvedStep;
  position: number;
  total: number;
  done: boolean;
  onToggleDone: () => void;
  safetyOpen: boolean;
};

export function StepCard({ step, position, total, done, onToggleDone, safetyOpen }: StepCardProps) {
  const { controls } = step;
  const temperature = temperatureText(controls);

  return (
    <article aria-labelledby={`step-${step.step}`} className={`space-y-4 ${CARD}`}>
      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-butter text-3xl font-bold text-butter-ink tabular-nums"
        >
          {position}
        </span>
        <div className="min-w-0">
          <p className={SECTION_LABEL}>{`Paso ${position} de ${total}`}</p>
          <h2 id={`step-${step.step}`} className="text-2xl font-semibold">
            {step.title}
          </h2>
        </div>
      </header>

      <div>
        <h3 className="text-sm font-semibold tracking-wide text-mint-ink uppercase">Agregar a la jarra:</h3>
        {step.additions.length === 0 ? (
          <p className="mt-1 text-xl text-muted">{NO_NEW_INGREDIENTS}</p>
        ) : (
          <ul aria-label="Ingredientes de este paso" className="mt-1 space-y-1 text-xl">
            {step.additions.map((addition) => (
              <li key={`${addition.ingredientId}-${addition.role}`}>
                {`${addition.name} — `}
                <strong className="font-bold text-text">{formatGrams(addition.grams)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-lg">{step.instructions}</p>

      <ul aria-label="Ajustes indicativos" className="flex flex-wrap gap-2">
        {controls.durationSecondsRange && (
          <Chip icon={<Timer aria-hidden="true" size={20} />} tint={TINTS.sky}>{formatDuration(controls.durationSecondsRange)}</Chip>
        )}
        {temperature && <Chip icon={<Thermometer aria-hidden="true" size={20} />} tint={TINTS.peach}>{temperature}</Chip>}
        <Chip icon={<Gauge aria-hidden="true" size={20} />} tint={TINTS.lavender}>{speedText(controls)}</Chip>
        {controls.reverseIfSupported && (
          <Chip icon={<Repeat aria-hidden="true" size={20} />} tint={TINTS.mint}>Reversa si tu modelo lo permite</Chip>
        )}
      </ul>
      <p className="text-sm text-muted">{`Texto original: ${step.sourceSettingsText}`}</p>

      {step.safetyNotes.length > 0 && (
        <ul aria-label="Notas de seguridad" className={`space-y-2 ${CALLOUT}`}>
          {step.safetyNotes.map((note) => (
            <li key={note} className="flex gap-2 text-lg">
              <TriangleAlert aria-hidden="true" size={20} className="mt-1 shrink-0" />
              {note}
            </li>
          ))}
        </ul>
      )}

      <SafetyBanner controls={controls} defaultOpen={safetyOpen} />

      <label className="tap flex cursor-pointer items-center gap-3 rounded-2xl border border-border px-4 transition-colors duration-150 has-[:checked]:border-mint-ink has-[:checked]:bg-mint has-[:checked]:text-mint-ink">
        <input type="checkbox" checked={done} onChange={onToggleDone} className="h-6 w-6 accent-mint-ink" />
        <span className="font-semibold">Marcar listo</span>
        {done && <Check aria-hidden="true" size={20} className="ml-auto" />}
      </label>
    </article>
  );
}
