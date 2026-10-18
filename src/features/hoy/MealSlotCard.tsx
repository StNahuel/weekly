import { BookOpen, Clock, ListChecks, Shuffle } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import { setSlot } from '../../db/repo';
import type { FavoriteRecord } from '../../db/types';
import { slotSuitability, type MealSlot } from '../../domain/day/slots';
import { BUSY_MAX_PREP_MINUTES } from '../../domain/meals/filters';
import { resolveMeal, resolveTemplate, soupIngredientLookup, type MealContext } from '../../domain/meals/resolveMeal';
import { resolveSoup } from '../../domain/soups/resolveSoup';
import { formatTime } from '../../domain/format';
import type { DayType, MealType } from '../../domain/types';
import { NutritionDisclosure } from '../quecomo/NutritionDisclosure';
import type { Dietary } from '../shared/candidates';
import { IngredientLines, ProteinBlock, SideBlock } from '../shared/MealBlocks';
import { soupSlotLabel } from '../shared/sideLabel';
import { MEAL_LABELS, SOCIAL_DINNER_TEXT } from './labels';
import { nextSlot } from './reshuffle';
import { SlotPicker } from './SlotPicker';
import { SocialDinnerMenu } from './SocialDinnerMenu';

export const EMPTY_SLOT_TEXT = 'Sin opciones con estos filtros. Probá quitar filtros en Ajustes.';
export const FREE_SLOT_TEXT = 'Comida libre — sin plan de comida.';

type MealSlotCardProps = {
  date: string;
  mealType: MealType;
  time: string;
  slot: MealSlot;
  dayType: DayType;
  ctx: MealContext;
  favorites: readonly FavoriteRecord[];
  dietary: Dietary;
};

function SlotBody({ slot, ctx }: { slot: MealSlot; ctx: MealContext }) {
  if (slot.kind === 'social') return <p className="mt-2">{SOCIAL_DINNER_TEXT[slot.social]}</p>;
  if (slot.kind === 'skip') return <p className="mt-2 text-muted">Sin plan para esta comida.</p>;
  if (slot.kind === 'free') return <p className="mt-2 text-muted">{FREE_SLOT_TEXT}</p>;
  if (slot.kind === 'soup') {
    const recipe = ctx.recipes.get(slot.soupId);
    if (recipe) {
      const soup = resolveSoup(recipe, { ...ctx.soupPrefs(slot.soupId), servings: slot.servings }, ctx.catalog);
      return (
        <div className="mt-2 space-y-3">
          <div>
            <p className="font-semibold">{soupSlotLabel(recipe.title, slot.servings)}</p>
            <IngredientLines lines={soup.totals} />
            <Link
              to={`/cocinar/${recipe.id}?p=${slot.servings}`}
              aria-label={`Ver receta de ${recipe.title}`}
              className="tap mt-1 inline-flex items-center gap-2 font-semibold text-sage underline-offset-4 hover:underline"
            >
              <BookOpen aria-hidden="true" size={20} />
              Ver receta
            </Link>
          </div>
          <NutritionDisclosure lines={soup.totals} />
        </div>
      );
    }
  }
  if (slot.kind === 'template') {
    const template = ctx.templates.get(slot.templateId);
    if (template) {
      const meal = resolveTemplate(template, ctx.catalog);
      return (
        <div className="mt-2 space-y-3">
          <div>
            <p className="font-semibold">{meal.title}</p>
            <IngredientLines lines={meal.lines} />
          </div>
          <NutritionDisclosure lines={meal.lines} />
        </div>
      );
    }
  }
  if (slot.kind === 'combo') {
    const protein = ctx.proteins.get(slot.proteinId);
    const side = ctx.sides.get(slot.sideId);
    if (protein && side) {
      const meal = resolveMeal(protein, side, ctx);
      return (
        <div className="mt-2 space-y-3">
          <ProteinBlock protein={protein} meal={meal} />
          <SideBlock side={side} meal={meal} />
          <NutritionDisclosure lines={meal.lines} />
        </div>
      );
    }
  }
  return (
    <div className="mt-2">
      <Empty title={EMPTY_SLOT_TEXT} />
    </div>
  );
}

export function MealSlotCard({ date, mealType, time, slot, dayType, ctx, favorites, dietary }: MealSlotCardProps) {
  const headingId = useId();
  const [picking, setPicking] = useState(false);
  const slow = slotSuitability(slot, dayType, ctx) === 'slow_for_busy';
  const soupIngredientIds = soupIngredientLookup(ctx);

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-border bg-surface p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          {MEAL_LABELS[mealType]}
        </h2>
        <span className="inline-flex items-center gap-1 text-muted">
          <Clock aria-hidden="true" size={20} />
          {formatTime(time)}
        </span>
      </header>
      <SlotBody slot={slot} ctx={ctx} />
      {slow && (
        <p className="mt-2 text-sm text-gold">{`Lleva más de ${BUSY_MAX_PREP_MINUTES} min`}</p>
      )}
      {slot.kind !== 'social' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void setSlot(date, mealType, nextSlot(mealType, slot, dayType, dietary, soupIngredientIds))}
            className="tap inline-flex items-center justify-center gap-2 rounded-xl bg-sage px-3 font-semibold text-bg"
          >
            <Shuffle aria-hidden="true" size={20} />
            Otra opción
          </button>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="tap inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 font-semibold"
          >
            <ListChecks aria-hidden="true" size={20} />
            Elegir
          </button>
        </div>
      )}
      {mealType === 'dinner' && (
        <SocialDinnerMenu
          date={date}
          slot={slot}
          dayType={dayType}
          dietary={dietary}
          soupIngredientIds={soupIngredientIds}
        />
      )}
      {picking && (
        <SlotPicker
          date={date}
          mealType={mealType}
          dayType={dayType}
          slot={slot}
          ctx={ctx}
          favorites={favorites}
          dietary={dietary}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  );
}
