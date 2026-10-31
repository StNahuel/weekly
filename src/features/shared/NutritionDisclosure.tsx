import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { CALLOUT } from '../../app/ui';
import type { NutritionEstimate } from '../../domain/nutrition';

export function NutritionDisclosure({ estimate }: { estimate: NutritionEstimate }) {
  const [open, setOpen] = useState(false);

  return (
    <details open={open} className="rounded-3xl border border-border bg-surface p-1">
      <summary
        aria-expanded={open}
        onClick={(event) => {
          // The open state drives rendering, so closed macros are absent from the DOM, not just hidden.
          event.preventDefault();
          setOpen((value) => !value);
        }}
        className="tap flex cursor-pointer list-none items-center justify-between gap-2 rounded-full bg-lavender px-4 font-semibold text-lavender-ink transition-colors duration-150"
      >
        Ver nutrición estimada (por porción)
        <ChevronDown aria-hidden="true" size={20} className={open ? 'rotate-180' : ''} />
      </summary>
      {open && (
        <div className="space-y-2 px-3 pt-3 pb-3 text-base">
          <p>{`≈ ${estimate.kcal} kcal · ${Math.round(estimate.protein)} g prot · ${Math.round(estimate.carbs)} g carb · ${Math.round(estimate.fat)} g grasa`}</p>
          <p className="text-sm text-muted">Estimación con valores genéricos por 100 g; no es una etiqueta ni una indicación médica.</p>
          {!estimate.complete && (
            <div className={`${CALLOUT} text-sm`}>
              <p className="font-semibold">Estimación incompleta</p>
              <p>{`Sin datos de etiqueta: ${estimate.missing.join(', ')}. Sumá los valores del envase.`}</p>
            </div>
          )}
        </div>
      )}
    </details>
  );
}
