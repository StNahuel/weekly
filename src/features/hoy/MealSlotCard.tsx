import { BookOpen, Check, Clock, ListChecks, Lock, LockOpen, Shuffle } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, LINK, TOGGLE, WARN_PILL } from '../../app/ui';
import { setFlag, setSlot } from '../../db/repo';
import {
  BUSY_MAX_PREP_MINUTES,
  slotSuitability,
  type DietaryExclusions,
  type MealSlot,
  type SlotFlags,
} from '../../domain/day/slots';
import { formatTime } from '../../domain/format';
import { resolveSlot, type MealContext, type ResolvedMeal } from '../../domain/meals/resolveSlot';
import type { DayType, MealType } from '../../domain/types';
import { IngredientLines } from '../shared/IngredientLines';
import { NutritionDisclosure } from '../shared/NutritionDisclosure';
import { soupSlotLabel } from '../shared/servings';
import { MEAL_TINTS } from '../shared/tints';
import { MEAL_LABELS, SOCIAL_DINNER_TEXT } from './labels';
import { MealChooser } from './MealChooser';
import { nextSlot } from './reshuffle';
import { SocialDinnerMenu } from './SocialDinnerMenu';

const EMPTY_TEXT = 'Sin comida elegida. Probá Otra opción o Cambiar; si no aparece nada, revisá tus exclusiones en Ajustes.';
const V1_EMPTY_TEXT = 'Tu elección anterior ya no existe en el catálogo.';
const SKIP_TEXT = 'Sin plan para esta comida.';

type MealSlotCardProps = {
  date: string;
  mealType: MealType;
  time: string;
  slot: MealSlot;
  flags: SlotFlags;
  dayType: DayType;
  ctx: MealContext;
  dietary: DietaryExclusions;
  onChanged: (mealType: MealType) => void;
};

function MealBody({ slot, meal, ctx }: { slot: MealSlot; meal: ResolvedMeal; ctx: MealContext }) {
  const recipe = slot.kind === 'dinner' ? ctx.recipes.get(slot.soupRecipeId) : undefined;
  if (slot.kind !== 'dinner' || !recipe) return <IngredientLines lines={meal.lines} />;
  return (
    <>
      <IngredientLines lines={meal.lines.filter((l) => l.source === 'protein')} />
      <p className="mt-2 font-semibold">{soupSlotLabel(recipe.title, slot.soupServings)}</p>
      <IngredientLines lines={meal.lines.filter((l) => l.source === 'soup')} />
      <Link
        to={`/sopas/${recipe.id}?p=${slot.soupServings}`}
        aria-label={`Ver receta de ${recipe.title}`}
        className={`${LINK} mt-1`}
      >
        <BookOpen aria-hidden="true" size={20} />
        Ver receta
      </Link>
    </>
  );
}

function placeholderText(slot: MealSlot): string | null {
  switch (slot.kind) {
    case 'social':
      return SOCIAL_DINNER_TEXT[slot.social];
    case 'skip':
      return SKIP_TEXT;
    case 'empty':
      return slot.note?.startsWith('v1:') ? V1_EMPTY_TEXT : EMPTY_TEXT;
    default:
      return null;
  }
}

export function MealSlotCard(props: MealSlotCardProps) {
  const { date, mealType, time, slot, flags, dayType, ctx, dietary, onChanged } = props;
  const headingId = useId();
  const [choosing, setChoosing] = useState(false);
  const meal = useMemo(() => resolveSlot(slot, ctx), [slot, ctx]);
  const lookup = useMemo(
    () => ({ templates: ctx.templates, dinners: [...ctx.dinners.values()], recipes: ctx.recipes }),
    [ctx],
  );
  const slow = slotSuitability(slot, dayType, lookup) === 'slow_for_busy';
  const tint = MEAL_TINTS[mealType];
  const placeholder = placeholderText(slot);

  const reshuffle = async () => {
    await setSlot(date, mealType, nextSlot(mealType, slot, dietary));
    onChanged(mealType);
  };

  return (
    <section aria-labelledby={headingId} className={`${CARD} overflow-hidden`}>
      <header className={`-mx-4 -mt-4 flex items-center justify-between gap-3 px-4 py-3 ${tint.fill} ${tint.ink}`}>
        <h2 id={headingId} className="text-lg font-semibold">
          {MEAL_LABELS[mealType]}
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface/70 px-3 py-0.5 font-semibold">
          <Clock aria-hidden="true" size={20} />
          {formatTime(time)}
        </span>
      </header>
      {meal ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="font-semibold">{meal.title}</p>
            <MealBody slot={slot} meal={meal} ctx={ctx} />
          </div>
          <NutritionDisclosure lines={meal.lines} />
        </div>
      ) : (
        <p className={`mt-3 ${slot.kind === 'social' ? '' : 'text-muted'}`}>{placeholder}</p>
      )}
      {slow && (
        <p className="mt-2">
          <span className={WARN_PILL}>{`Lleva más de ${BUSY_MAX_PREP_MINUTES} min`}</span>
        </p>
      )}
      {slot.kind !== 'social' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void reshuffle()} className={BTN_PRIMARY}>
            <Shuffle aria-hidden="true" size={20} />
            Otra opción
          </button>
          <button type="button" onClick={() => setChoosing(true)} className={BTN_SECONDARY}>
            <ListChecks aria-hidden="true" size={20} />
            Cambiar
          </button>
        </div>
      )}
      {meal && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={flags.eaten}
            onClick={() => void setFlag(date, mealType, { eaten: !flags.eaten })}
            className={TOGGLE}
          >
            <Check aria-hidden="true" size={16} />
            {flags.eaten ? 'Comido' : 'Marcar comido'}
          </button>
          <button
            type="button"
            aria-pressed={flags.locked}
            onClick={() => void setFlag(date, mealType, { locked: !flags.locked })}
            className={TOGGLE}
          >
            {flags.locked ? <Lock aria-hidden="true" size={16} /> : <LockOpen aria-hidden="true" size={16} />}
            {flags.locked ? 'Fijado' : 'Fijar'}
          </button>
        </div>
      )}
      {mealType === 'dinner' && <SocialDinnerMenu date={date} slot={slot} dietary={dietary} onChanged={onChanged} />}
      {choosing && (
        <MealChooser
          date={date}
          mealType={mealType}
          slot={slot}
          ctx={ctx}
          dietary={dietary}
          onSaved={() => {
            setChoosing(false);
            onChanged(mealType);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
    </section>
  );
}
