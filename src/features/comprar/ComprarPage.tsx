import { ChevronDown, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Loading } from '../../app/states/Loading';
import { useProfile } from '../../app/useProfile';
import { resetChecked } from '../../db/repo';
import { localDateKey } from '../../domain/day/today';
import { formatDateKey } from '../../domain/format';
import { buildPlanDays } from '../../domain/shopping/horizon';
import { defaults } from '../../seed/defaults';
import { useFavorites } from '../shared/useFavorites';
import { useMealContext } from '../shared/useMealContext';
import { GroceryList } from './GroceryList';
import { PlanHeader } from './PlanHeader';
import { PlannedMealRow } from './PlannedMealRow';
import { usePlan } from './usePlan';

export default function ComprarPage() {
  const plan = usePlan();
  const ctx = useMealContext();
  const favorites = useFavorites();
  const profile = useProfile();
  const [today] = useState(() => localDateKey(new Date(), defaults.timezone));
  const [showPlan, setShowPlan] = useState(false);

  const heading = (
    <header>
      <h1 className="text-2xl font-semibold">Comprar</h1>
      <p className="text-muted">Lista opcional para los próximos días.</p>
    </header>
  );
  if (plan === undefined || !ctx || !favorites || !profile) {
    return (
      <div className="space-y-4">
        {heading}
        <Loading />
      </div>
    );
  }

  const planDays = plan ? buildPlanDays(plan.startDate, plan.horizonDays, profile.schedule.template) : [];
  const dayTypeOf = new Map(planDays.map((day) => [day.date, day.suggestedDayType]));
  const dates = plan ? [...new Set(plan.meals.map((meal) => meal.date))] : [];

  return (
    <div className="space-y-4">
      {heading}
      <PlanHeader key={plan ? 'plan' : 'none'} plan={plan} profile={profile} today={today} />
      {plan && (
        <>
          <section aria-label="Comidas del plan" className="rounded-2xl border border-border bg-surface p-4">
            <button
              type="button"
              aria-expanded={showPlan}
              onClick={() => setShowPlan((value) => !value)}
              className="tap flex w-full items-center justify-between gap-2 font-semibold"
            >
              {showPlan ? 'Ocultar plan' : 'Ver plan'}
              <ChevronDown aria-hidden="true" size={20} className={showPlan ? 'rotate-180' : ''} />
            </button>
            {showPlan &&
              dates.map((date) => (
                <div key={date} className="mt-3">
                  <h2 className="text-lg font-semibold first-letter:uppercase">{formatDateKey(date)}</h2>
                  {plan.meals.map((meal, index) =>
                    meal.date === date ? (
                      <PlannedMealRow
                        key={`${index}-${meal.mealType}`}
                        meal={meal}
                        index={index}
                        dayType={dayTypeOf.get(date) ?? 'rest'}
                        ctx={ctx}
                        favorites={favorites}
                        dietary={profile.dietary}
                      />
                    ) : null,
                  )}
                </div>
              ))}
          </section>
          <GroceryList plan={plan} ctx={ctx} />
          <button
            type="button"
            disabled={plan.checkedKeys.length === 0}
            onClick={() => void resetChecked()}
            className="tap inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 font-semibold disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" size={20} />
            Reiniciar marcados
          </button>
        </>
      )}
    </div>
  );
}
