import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfile } from '../../app/useProfile';
import { Loading } from '../../app/states/Loading';
import type { ProfileRecord } from '../../db/types';
import type { DayRecord } from '../../domain/day/slots';
import { formatDateKey } from '../../domain/format';
import type { MealContext } from '../../domain/meals/resolveSlot';
import { MEAL_TYPES } from '../../domain/types';
import { defaults } from '../../seed/defaults';
import { Onboarding } from '../ajustes/Onboarding';
import { useMealContext } from '../shared/useMealContext';
import { DayStatus } from './DayStatus';
import { DayTypeChip } from './DayTypeChip';
import { DayTypePrompt } from './DayTypePrompt';
import { MealSlotCard } from './MealSlotCard';
import { RebalanceCard } from './RebalanceCard';
import { useDayProjection } from './useDayProjection';
import { TOLERANCE_KCAL, useRebalance } from './useRebalance';
import { useToday } from './useToday';

function DayPlan({ day, profile, ctx }: { day: DayRecord; profile: ProfileRecord; ctx: MealContext }) {
  const projection = useDayProjection(day, ctx);
  const rebalance = useRebalance(day, projection, ctx, profile);

  return (
    <>
      <DayTypeChip day={day} />
      <DayStatus
        projection={projection}
        targetKcal={profile.nutrition.dailyCalorieTargetKcal}
        proteinFloorGrams={defaults.interface.rebalancing.minDailyProteinGrams}
      />
      {MEAL_TYPES.map((mealType) => (
        <div key={mealType} className="space-y-3">
          <MealSlotCard
            date={day.date}
            mealType={mealType}
            time={profile.schedule.meals[mealType]}
            slot={day.slots[mealType]}
            flags={day.flags[mealType]}
            dayType={day.dayType}
            ctx={ctx}
            dietary={profile.dietary}
            onChanged={rebalance.markChanged}
          />
          {rebalance.changedMealType === mealType && rebalance.result && (
            <RebalanceCard
              result={rebalance.result}
              toleranceKcal={TOLERANCE_KCAL}
              onApply={() => void rebalance.apply()}
              onDismiss={rebalance.dismiss}
            />
          )}
        </div>
      ))}
    </>
  );
}

export default function HoyPage() {
  const { dateKey, day, suggestion } = useToday();
  const profile = useProfile();
  const ctx = useMealContext();

  const body = () => {
    if (day === undefined || !suggestion || !profile || !ctx) return <Loading />;
    if (!profile.onboardingCompletedAt) return <Onboarding profile={profile} />;
    if (day === null) {
      return <DayTypePrompt key={dateKey} dateKey={dateKey} suggestion={suggestion} dietary={profile.dietary} />;
    }
    return <DayPlan day={day} profile={profile} ctx={ctx} />;
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hoy</h1>
          <p className="text-muted">{formatDateKey(dateKey)}</p>
        </div>
        <Link
          to="/ajustes"
          aria-label="Ajustes"
          className="tap inline-flex items-center justify-center rounded-full border border-border bg-surface text-muted shadow-soft transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          <Settings aria-hidden="true" size={22} />
        </Link>
      </header>
      {body()}
    </div>
  );
}
