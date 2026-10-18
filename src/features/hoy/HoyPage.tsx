import { useProfile } from '../../app/useProfile';
import { Loading } from '../../app/states/Loading';
import { formatDateKey } from '../../domain/format';
import { soupIngredientLookup } from '../../domain/meals/resolveMeal';
import { Onboarding } from '../ajustes/Onboarding';
import { MEAL_TYPES } from '../../domain/types';
import { useFavorites } from '../shared/useFavorites';
import { useMealContext } from '../shared/useMealContext';
import { DayTypeChip } from './DayTypeChip';
import { DayTypePrompt } from './DayTypePrompt';
import { MealSlotCard } from './MealSlotCard';
import { useToday } from './useToday';

export default function HoyPage() {
  const { dateKey, day, suggestion } = useToday();
  const ctx = useMealContext();
  const favorites = useFavorites();
  const profile = useProfile();

  const body = () => {
    if (day === undefined || !suggestion || !ctx || !favorites || !profile) return <Loading />;
    if (!profile.onboardingCompletedAt) return <Onboarding profile={profile} />;
    if (day === null) return (
        <DayTypePrompt
          key={dateKey}
          dateKey={dateKey}
          suggestion={suggestion}
          dietary={profile.dietary}
          soupIngredientIds={soupIngredientLookup(ctx)}
        />
      );
    return (
      <>
        <DayTypeChip day={day} />
        {MEAL_TYPES.map((mealType) => (
          <MealSlotCard
            key={mealType}
            date={day.date}
            mealType={mealType}
            time={profile.schedule.meals[mealType]}
            slot={day.slots[mealType]}
            dayType={day.dayType}
            ctx={ctx}
            favorites={favorites}
            dietary={profile.dietary}
          />
        ))}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Hoy</h1>
        <p className="text-muted">{formatDateKey(dateKey)}</p>
      </header>
      {body()}
    </div>
  );
}
