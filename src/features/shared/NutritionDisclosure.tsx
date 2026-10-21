import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calculateNutrition, type NutritionLine } from '../../domain/meals/calculateNutrition';
import { CALLOUT } from '../../app/ui';
import { defaults } from '../../seed/defaults';
import { ingredientById } from '../../seed/foods';

export function NutritionDisclosure({ lines }: { lines: readonly NutritionLine[] }) {
  const [open, setOpen] = useState(!defaults.interface.macrosCollapsedDefault);
  const estimate = useMemo(() => calculateNutrition(lines, ingredientById), [lines]);
  const missingNames = [...new Set(estimate.missing.map((m) => m.name))].join(', ');

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
        Ver nutrición estimada
        <ChevronDown aria-hidden="true" size={20} className={open ? 'rotate-180' : ''} />
      </summary>
      {open && (
        <div className="space-y-2 px-3 pt-3 pb-3 text-base">
          <p>{`≈ ${Math.round(estimate.kcal)} kcal · ${Math.round(estimate.protein)} g prot · ${Math.round(estimate.carbs)} g carb · ${Math.round(estimate.fat)} g grasa`}</p>
          <p className="text-sm text-muted">
            Estimación a partir de valores genéricos por 100 g; no es una etiqueta ni una indicación médica.
          </p>
          {!estimate.complete && (
            <div className={`${CALLOUT} text-sm`}>
              <p className="font-semibold">Estimación incompleta</p>
              <p>{`Sin datos de etiqueta: ${missingNames}`}</p>
            </div>
          )}
        </div>
      )}
    </details>
  );
}
