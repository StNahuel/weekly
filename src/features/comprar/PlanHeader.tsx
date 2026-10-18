import { CalendarDays } from 'lucide-react';
import { useId, useState } from 'react';
import { Empty } from '../../app/states/Empty';
import { BTN_PRIMARY, CARD, FIELD, SEGMENTS } from '../../app/ui';
import type { ProfileRecord, ShoppingPlanRecord } from '../../db/types';
import { formatDateKey } from '../../domain/format';
import { defaultHorizonDays, horizonOptions } from '../../domain/shopping/horizon';
import { createPlan, regeneratePlan } from './usePlan';

type PlanHeaderProps = { plan: ShoppingPlanRecord | null; profile: ProfileRecord; today: string };

export function PlanHeader({ plan, profile, today }: PlanHeaderProps) {
  const startId = useId();
  const [horizon, setHorizon] = useState(plan?.horizonDays ?? defaultHorizonDays);
  const [start, setStart] = useState(plan?.startDate ?? today);
  const [saving, setSaving] = useState(false);
  const min = Math.min(...horizonOptions);
  const max = Math.max(...horizonOptions);

  const build = async () => {
    setSaving(true);
    try {
      const inputs = { dietary: profile.dietary, template: profile.schedule.template };
      await (plan ? regeneratePlan : createPlan)(start, horizon, inputs);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section aria-label="Plan de compras" className={`space-y-4 ${CARD}`}>
        <div>
          <p id={`${startId}-horizon`} className="text-sm font-semibold">
            Planificar próximos
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div
              role="group"
              aria-labelledby={`${startId}-horizon`}
              className={`${SEGMENTS} flex-1 grid-flow-col`}
            >
              {horizonOptions.map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-label={`${days} días`}
                  aria-pressed={days === horizon}
                  onClick={() => setHorizon(days)}
                  className="tap rounded-full font-semibold text-muted transition-colors duration-150 aria-pressed:bg-butter aria-pressed:text-butter-ink"
                >
                  {days}
                </button>
              ))}
            </div>
            <span aria-hidden="true" className="text-muted">
              días
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor={startId} className="block text-sm font-semibold">
            Desde
          </label>
          <input
            id={startId}
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className={`${FIELD} w-full`}
          />
        </div>
        <button
          type="button"
          disabled={saving || start === ''}
          onClick={() => void build()}
          className={`${BTN_PRIMARY} w-full`}
        >
          <CalendarDays aria-hidden="true" size={20} />
          {plan ? 'Rearmar plan' : 'Armar plan'}
        </button>
        {plan && (
          <p className="text-sm text-muted">
            {`Plan desde el ${formatDateKey(plan.startDate)}, ${plan.horizonDays} días. Rearmar mantiene tus favoritos, sopas y comidas marcadas, y vuelve a sugerir el resto. En los días ya confirmados en Hoy mandan las comidas de Hoy, aunque las hayas marcado distinto en el plan.`}
          </p>
        )}
      </section>
      {!plan && <Empty title={`Todavía no hay plan. Es opcional: armá uno de ${min} a ${max} días cuando quieras.`} />}
    </div>
  );
}
