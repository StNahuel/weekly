import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { DayProjection } from '../../domain/nutrition/projectDay';
import { dayStatusLine, incompleteLine, proteinFloorLine } from '../../domain/nutrition/statusCopy';
import { CALLOUT } from '../../app/ui';

type DayStatusProps = { projection: DayProjection; targetKcal: number; proteinFloorGrams: number };

export function DayStatus({ projection, targetKcal, proteinFloorGrams }: DayStatusProps) {
  const [open, setOpen] = useState(false);
  const incomplete = incompleteLine(projection.unknown);
  const proteinLow = proteinFloorLine(projection.total.protein, proteinFloorGrams);

  return (
    <details open={open} className="rounded-3xl border border-border bg-surface p-1 shadow-soft">
      <summary
        aria-expanded={open}
        onClick={(event) => {
          // Closed status stays out of the DOM so no number shows until asked for.
          event.preventDefault();
          setOpen((value) => !value);
        }}
        className="tap flex cursor-pointer list-none items-center justify-between gap-2 rounded-full bg-butter px-4 font-semibold text-butter-ink transition-colors duration-150"
      >
        Ver estado del día
        <ChevronDown aria-hidden="true" size={20} className={open ? 'rotate-180' : ''} />
      </summary>
      {open && (
        <div className="space-y-2 px-3 pt-3 pb-3 text-base" aria-live="polite">
          <p className="font-semibold">
            {!projection.complete && <span className="font-normal text-muted">Subtotal conocido: </span>}
            {dayStatusLine(projection.total, targetKcal)}
          </p>
          {incomplete && <p className={`${CALLOUT} text-sm`}>{incomplete}</p>}
          {proteinLow && <p className="text-sm">{proteinLow}</p>}
          <p className="text-sm text-muted">Objetivo editable y provisional; no es una indicación médica.</p>
        </div>
      )}
    </details>
  );
}
