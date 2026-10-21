import { Check, X } from 'lucide-react';
import { BTN_PRIMARY, BTN_SECONDARY } from '../../app/ui';
import { proposalLines, unresolvedLine } from '../../domain/nutrition/statusCopy';
import { MEAL_WITH_ARTICLE } from './labels';
import type { RebalanceResult } from './useRebalance';

const kcalFormat = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 });

type RebalanceCardProps = {
  result: RebalanceResult;
  toleranceKcal: number;
  onApply: () => void;
  onDismiss: () => void;
};

export function RebalanceCard({ result, toleranceKcal, onApply, onDismiss }: RebalanceCardProps) {
  const body = () => {
    if ('unresolved' in result) {
      return (
        <>
          <p>{unresolvedLine(result.unresolved)}</p>
          <button type="button" onClick={onDismiss} className={`${BTN_SECONDARY} w-full`}>
            Entendido
          </button>
        </>
      );
    }
    const gap = result.kcalDelta + result.residualKcal;
    const [change, rest] = proposalLines(result, toleranceKcal);
    return (
      <>
        <p className="text-sm text-muted">
          {`Con este cambio el día queda unas ${kcalFormat.format(Math.abs(gap))} kcal ${
            gap > 0 ? 'por debajo' : 'por encima'
          } del objetivo. Propuesta para ${MEAL_WITH_ARTICLE[result.mealType]}:`}
        </p>
        <p className="text-lg font-semibold">{change}</p>
        {rest && <p className="text-sm">{rest}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onDismiss} className={BTN_SECONDARY}>
            <X aria-hidden="true" size={20} />
            No, gracias
          </button>
          <button type="button" onClick={onApply} className={BTN_PRIMARY}>
            <Check aria-hidden="true" size={20} />
            Aplicar
          </button>
        </div>
      </>
    );
  };

  return (
    <section
      role="region"
      aria-label="Ajuste sugerido"
      aria-live="polite"
      className="space-y-3 rounded-3xl border-2 border-gold bg-surface p-4 shadow-soft"
    >
      <h2 className="text-lg font-semibold">Ajuste sugerido</h2>
      {body()}
    </section>
  );
}
