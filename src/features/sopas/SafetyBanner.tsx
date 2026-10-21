import { ChevronDown, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import type { Controls } from '../../domain/schemas/soups.schema';
import { soups } from '../../seed/soups';
import { seedTextEs } from './copy';
import { needsSafetyBanner } from './safety';


export function SafetyBanner({ controls, defaultOpen }: { controls: Controls; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  if (!needsSafetyBanner(controls)) return null;

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
          <li>{seedTextEs(soups.safety.hotBlend)}</li>
          <li>{seedTextEs(soups.safety.vapor)}</li>
        </ul>
      )}
    </section>
  );
}
