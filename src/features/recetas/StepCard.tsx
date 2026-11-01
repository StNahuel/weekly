import { Check, ChevronDown, Flame, Gauge, Repeat, Thermometer, Timer, TriangleAlert } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { CALLOUT, CARD, SECTION_LABEL } from '../../app/ui';
import { formatDuration, formatGrams } from '../../domain/format';
import { CAPACITY_WARNING_GRAMS, type ResolvedStep } from '../../domain/recipes/resolve';
import type { MachineSettings } from '../../domain/recipes/types';
import { DeviceChip } from '../shared/DeviceChips';
import { TINTS, type Tint } from '../shared/labels';
import { BONE_BROTH_STEP_TEXT, HOT_BLEND_TEXT, needsSafetyBanner, NO_NEW_INGREDIENTS, VAPOR_TEXT } from './copy';

const speedFormat = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 });

function speedText({ speed }: MachineSettings): string {
  switch (speed.mode) {
    case 'numeric':
      return speed.value === null ? 'Velocidad: ver texto original' : `Vel. ${speedFormat.format(speed.value)}`;
    case 'gradual':
      return speed.value === null ? 'Subir la velocidad gradualmente' : `Subir gradualmente hasta vel. ${speedFormat.format(speed.value)}`;
    case 'manual':
      return 'Mezclar a mano / sin programa';
  }
}

function temperatureText({ temperatureCRange: range }: MachineSettings): string {
  if (!range) return 'Sin calor';
  const [min, max] = range;
  return min === max ? `${min} °C` : `${min}–${max} °C`;
}

function Chip({ icon, tint, children }: { icon: ReactNode; tint: Tint; children: string }) {
  return (
    <li className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-lg font-semibold ${tint.fill} ${tint.ink}`}>
      {icon}
      {children}
    </li>
  );
}

function Controls({ step }: { step: ResolvedStep }) {
  const { machine } = step;
  if (machine) {
    return (
      <ul aria-label="Ajustes indicativos" className="flex flex-wrap gap-2">
        {machine.durationSecondsRange && (
          <Chip icon={<Timer aria-hidden="true" size={20} />} tint={TINTS.sky}>
            {formatDuration(machine.durationSecondsRange)}
          </Chip>
        )}
        {machine.speed.mode !== 'manual' && (
          <Chip icon={<Thermometer aria-hidden="true" size={20} />} tint={TINTS.peach}>
            {temperatureText(machine)}
          </Chip>
        )}
        <Chip icon={<Gauge aria-hidden="true" size={20} />} tint={TINTS.lavender}>
          {speedText(machine)}
        </Chip>
        {machine.reverseIfSupported && (
          <Chip icon={<Repeat aria-hidden="true" size={20} />} tint={TINTS.mint}>
            Reversa si tu modelo lo permite
          </Chip>
        )}
      </ul>
    );
  }
  const chips = [
    step.minutes !== undefined && (
      <Chip key="time" icon={<Timer aria-hidden="true" size={20} />} tint={TINTS.sky}>
        {`${step.minutes} min`}
      </Chip>
    ),
    step.temperatureC !== undefined && (
      <Chip key="temp" icon={<Thermometer aria-hidden="true" size={20} />} tint={TINTS.peach}>
        {`${step.temperatureC} °C`}
      </Chip>
    ),
    step.heat !== undefined && (
      <Chip key="heat" icon={<Flame aria-hidden="true" size={20} />} tint={TINTS.rose}>
        {`Fuego ${step.heat}`}
      </Chip>
    ),
  ].filter(Boolean);
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Tiempo y temperatura" className="flex flex-wrap gap-2">
      {chips}
    </ul>
  );
}

function SafetyBanner({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <section aria-label="Seguridad con la jarra caliente" className="rounded-3xl border-2 border-gold bg-gold/25">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="tap flex w-full items-center justify-between gap-2 px-4 text-left font-semibold text-text"
      >
        <span className="inline-flex items-center gap-2">
          <TriangleAlert aria-hidden="true" size={20} />
          Seguridad con la jarra caliente
        </span>
        <ChevronDown aria-hidden="true" size={20} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <ul id={panelId} className="space-y-2 px-4 pb-4 text-lg">
          <li>{HOT_BLEND_TEXT}</li>
          <li>{VAPOR_TEXT}</li>
        </ul>
      )}
    </section>
  );
}

type StepCardProps = {
  step: ResolvedStep;
  section: string;
  position: number;
  total: number;
  hint: string | null;
  done: boolean;
  onToggleDone: () => void;
  safetyOpen: boolean;
};

export function StepCard({ step, section, position, total, hint, done, onToggleDone, safetyOpen }: StepCardProps) {
  const headingId = useId();
  const stepGrams = step.additions.reduce((sum, a) => sum + a.grams, 0);
  return (
    <article aria-labelledby={headingId} className={`space-y-4 ${CARD}`}>
      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-butter text-3xl font-bold text-butter-ink tabular-nums"
        >
          {position}
        </span>
        <div className="min-w-0">
          <p className={SECTION_LABEL}>{`Paso ${position} de ${total} · ${section}`}</p>
          <h2 id={headingId} className="text-2xl font-semibold">
            {step.title}
          </h2>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <DeviceChip device={step.device} large />
        {hint && <span className="text-sm font-semibold text-muted">{hint}</span>}
      </div>

      <div>
        <h3 className="text-sm font-semibold tracking-wide text-mint-ink uppercase">Agregar:</h3>
        {step.additions.length === 0 ? (
          <p className="mt-1 text-xl text-muted">{NO_NEW_INGREDIENTS}</p>
        ) : (
          <ul aria-label="Ingredientes de este paso" className="mt-1 space-y-1 text-xl">
            {step.additions.map((addition) => (
              <li key={addition.ingredientId}>
                {`${addition.name} — `}
                <strong className="font-bold text-text">{formatGrams(addition.grams)}</strong>
                {addition.optional && <span className="text-base text-muted"> (opcional)</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {step.instructions && <p className="text-lg">{step.instructions}</p>}
      {step.usesBoneBroth && <p className="text-base text-muted">{BONE_BROTH_STEP_TEXT}</p>}

      <Controls step={step} />
      {step.machine?.sourceSettingsText && (
        <p className="text-sm text-muted">{`Texto original: ${step.machine.sourceSettingsText}`}</p>
      )}

      {step.verify && <p className={`${CALLOUT} text-lg`}>{`Verificá: ${step.verify}`}</p>}

      {step.safety.length > 0 && (
        <ul aria-label="Notas de seguridad" className={`space-y-2 ${CALLOUT}`}>
          {step.safety.map((note) => (
            <li key={note} className="flex gap-2 text-lg">
              <TriangleAlert aria-hidden="true" size={20} className="mt-1 shrink-0" />
              {note}
            </li>
          ))}
        </ul>
      )}

      {step.device === 'ichef' && stepGrams >= CAPACITY_WARNING_GRAMS && (
        <p className={`${CALLOUT} text-lg`}>
          {`Este paso suma ≈ ${formatGrams(stepGrams)} en la jarra: puede superar la marca MAX. Hacelo en dos tandas o usá una olla en la hornalla.`}
        </p>
      )}

      {step.machine && needsSafetyBanner(step.machine) && <SafetyBanner defaultOpen={safetyOpen} />}

      <label className="tap flex cursor-pointer items-center gap-3 rounded-2xl border border-border px-4 transition-colors duration-150 has-[:checked]:border-mint-ink has-[:checked]:bg-mint has-[:checked]:text-mint-ink">
        <input type="checkbox" checked={done} onChange={onToggleDone} className="h-6 w-6 accent-mint-ink" />
        <span className="font-semibold">Marcar listo</span>
        {done && <Check aria-hidden="true" size={20} className="ml-auto" />}
      </label>
    </article>
  );
}
