import { useState } from 'react';
import { Loading } from '../../app/states/Loading';
import { useProfile } from '../../app/useProfile';
import { resolveMeal, soupIngredientLookup } from '../../domain/meals/resolveMeal';
import { useToday } from '../hoy/useToday';
import {
  comboCandidates,
  firstPair,
  NO_LOCKS,
  reconcileCombo,
  type ComboDraft,
  type ComboFilters,
  type ComboLocks,
} from '../shared/candidates';
import { useFavorites } from '../shared/useFavorites';
import { useMealContext } from '../shared/useMealContext';
import { ComboPicker } from './ComboPicker';
import { FavoritesList } from './FavoritesList';
import { FiltersBar } from './FiltersBar';
import { NutritionDisclosure } from './NutritionDisclosure';

export default function QueComoPage() {
  const { day, suggestion } = useToday();
  const ctx = useMealContext();
  const favorites = useFavorites();
  const profile = useProfile();
  const [filters, setFilters] = useState<ComboFilters | null>(null);
  const [combo, setCombo] = useState<ComboDraft | null>(null);
  const [locks, setLocks] = useState<ComboLocks>(NO_LOCKS);

  const heading = <h1 className="text-2xl font-semibold">¿Qué como?</h1>;
  if (day === undefined || !suggestion || !ctx || !favorites || !profile) {
    return (
      <div className="space-y-4">
        {heading}
        <Loading />
      </div>
    );
  }

  const active = filters ?? { dayType: day?.dayType ?? suggestion.dayType, favoritesOnly: false };
  const soupIngredientIds = soupIngredientLookup(ctx);
  const candidatesFor = (next: ComboFilters) => comboCandidates(next, profile.dietary, favorites, soupIngredientIds);
  const candidates = candidatesFor(active);
  const current = combo ?? firstPair(candidates);
  // Committing the shown pair keeps locks pointing at what is on screen when the filters change.
  if (combo === null && current) setCombo(current);

  const changeFilters = (next: ComboFilters) => {
    setFilters(next);
    const nextCandidates = candidatesFor(next);
    setCombo(current ? reconcileCombo(current, nextCandidates, locks) : firstPair(nextCandidates));
  };

  const changeLocks = (next: ComboLocks) => {
    setLocks(next);
    if (current) setCombo(reconcileCombo(current, candidates, next));
  };
  const protein = current?.proteinId ? ctx.proteins.get(current.proteinId) : undefined;
  const side = current?.sideId ? ctx.sides.get(current.sideId) : undefined;
  const meal = protein && side ? resolveMeal(protein, side, ctx) : null;

  return (
    <div className="space-y-4">
      {heading}
      <FiltersBar filters={active} onChange={changeFilters} />
      <ComboPicker
        ctx={ctx}
        candidates={candidates}
        favorites={favorites}
        combo={current}
        onComboChange={setCombo}
        locks={locks}
        onLocksChange={changeLocks}
        dateKey={day?.date ?? null}
        saveTo={['lunch', 'dinner']}
      />
      {meal && <NutritionDisclosure lines={meal.lines} />}
      <FavoritesList favorites={favorites} onUse={({ proteinId, sideId }) => setCombo({ proteinId, sideId })} />
    </div>
  );
}
