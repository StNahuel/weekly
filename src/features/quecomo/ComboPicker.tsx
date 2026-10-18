import { Lock, LockOpen, Save, Shuffle, Star } from 'lucide-react';
import { useState } from 'react';
import { addFavorite, removeFavorite, setSlot } from '../../db/repo';
import type { FavoriteRecord } from '../../db/types';
import type { MealSlot } from '../../domain/day/slots';
import { resolveMeal, resolveProteinAlone, resolveSideAlone, type MealContext } from '../../domain/meals/resolveMeal';
import { pickCombo, type Combo } from '../../domain/meals/shuffle';
import type { MealType } from '../../domain/types';
import { Empty } from '../../app/states/Empty';
import { MEAL_LABELS } from '../hoy/labels';
import { firstPair, NO_LOCKS, type ComboCandidates, type ComboDraft, type ComboLocks } from '../shared/candidates';
import { ProteinBlock, SideBlock } from '../shared/MealBlocks';
import { sideLabel } from '../shared/sideLabel';

export const EMPTY_COMBO_TEXT = 'Sin opciones con estos filtros. Probá quitar filtros.';
const BOTH_LOCKED_TEXT = 'Proteína y acompañamiento están fijos. Soltá uno para ver otra opción.';
export const LOCKED_MISMATCH_TEXT = 'La parte fijada no cumple el filtro actual.';

type Part = keyof ComboLocks;

type ComboPickerProps = {
  ctx: MealContext;
  candidates: ComboCandidates;
  favorites: readonly FavoriteRecord[];
  combo: ComboDraft | null;
  onComboChange: (combo: Combo) => void;
  dateKey: string | null;
  saveTo: readonly MealType[];
  saveLabel?: string;
  onSaved?: (mealType: MealType) => void;
  saveSlot?: (mealType: MealType, slot: MealSlot) => Promise<void>;
  locks?: ComboLocks;
  onLocksChange?: (locks: ComboLocks) => void;
};

const outlined = 'tap inline-flex items-center justify-center gap-2 rounded-xl border px-3 font-semibold';

export function ComboPicker(props: ComboPickerProps) {
  const { ctx, candidates, favorites, combo, onComboChange, dateKey, saveTo, saveLabel, onSaved, saveSlot } = props;
  const [ownLocks, setOwnLocks] = useState<ComboLocks>(NO_LOCKS);
  const locks = props.locks ?? ownLocks;
  const setLocks = props.onLocksChange ?? setOwnLocks;
  const [openList, setOpenList] = useState<Part | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const current = combo ?? firstPair(candidates);
  const protein = current?.proteinId ? ctx.proteins.get(current.proteinId) : undefined;
  const side = current?.sideId ? ctx.sides.get(current.sideId) : undefined;
  const unknownPart = current !== null && ((current.proteinId !== null && !protein) || (current.sideId !== null && !side));
  if (!current || unknownPart || (!protein && !side)) return <Empty title={EMPTY_COMBO_TEXT} />;
  const pair = protein && side ? { proteinId: protein.id, sideId: side.id } : null;
  const meal = protein && side ? resolveMeal(protein, side, ctx) : null;
  const favorite = pair ? favorites.find((f) => f.proteinId === pair.proteinId && f.sideId === pair.sideId) : undefined;
  const lockedMismatch =
    (locks.protein && protein !== undefined && !candidates.proteins.some((p) => p.id === protein.id)) ||
    (locks.side && side !== undefined && !candidates.sides.some((s) => s.id === side.id));

  const change = (next: Combo) => {
    setNotice(null);
    onComboChange(next);
  };

  const shuffle = () => {
    const result = pickCombo({
      proteins: candidates.proteins,
      sides: candidates.sides,
      ...(candidates.pairs ? { pairs: candidates.pairs } : {}),
      ...(pair ? { previous: pair } : {}),
      ...(locks.protein && protein ? { lockedProteinId: protein.id } : {}),
      ...(locks.side && side ? { lockedSideId: side.id } : {}),
    });
    if (result.status === 'ok') change(result.combo);
    else setNotice(result.status === 'both_locked' ? BOTH_LOCKED_TEXT : EMPTY_COMBO_TEXT);
  };

  const toggleFavorite = async () => {
    if (favorite) await removeFavorite(favorite.id);
    else if (pair && meal) await addFavorite(pair.proteinId, pair.sideId, meal.title);
  };

  const save = async (mealType: MealType) => {
    if (!dateKey || !pair) return;
    const slot: MealSlot = { kind: 'combo', ...pair };
    await (saveSlot ? saveSlot(mealType, slot) : setSlot(dateKey, mealType, slot));
    setNotice(`Guardado en ${MEAL_LABELS[mealType].toLowerCase()}.`);
    onSaved?.(mealType);
  };

  const panel = (part: Part) => {
    const isProtein = part === 'protein';
    const noun = isProtein ? 'proteína' : 'acompañamiento';
    const options = isProtein
      ? candidates.proteins.map((p) => ({ id: p.id, label: p.title, prepMinutes: p.prepMinutes }))
      : candidates.sides.map((s) => ({ id: s.id, label: sideLabel(s), prepMinutes: s.prepMinutes }));
    const locked = locks[part];
    const block = isProtein
      ? protein && <ProteinBlock protein={protein} meal={meal ?? resolveProteinAlone(protein, ctx)} />
      : side && <SideBlock side={side} meal={meal ?? resolveSideAlone(side, ctx)} />;
    const heading = (
      <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">
        {isProtein ? 'Proteína' : 'Acompañamiento'}
      </h3>
    );
    if (!block) {
      return (
        <div className="rounded-xl border border-border bg-surface-2 p-3">
          {heading}
          <Empty title={EMPTY_COMBO_TEXT} />
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-3">
        {heading}
        <div className="mt-1">{block}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={locked}
            aria-label={`Fijar ${noun}`}
            onClick={() => {
              if (!locked && openList === part) setOpenList(null);
              setLocks({ ...locks, [part]: !locked });
            }}
            className={`${outlined} ${locked ? 'border-gold text-gold' : 'border-border text-text'}`}
          >
            {locked ? <Lock aria-hidden="true" size={20} /> : <LockOpen aria-hidden="true" size={20} />}
            Fijar
          </button>
          <button
            type="button"
            aria-label={`Cambiar ${noun}`}
            aria-expanded={openList === part}
            disabled={locked}
            onClick={() => setOpenList(openList === part ? null : part)}
            className={`${outlined} border-border text-text disabled:opacity-50`}
          >
            Cambiar
          </button>
        </div>
        {openList === part && (
          <ul aria-label={isProtein ? 'Proteínas disponibles' : 'Acompañamientos disponibles'} className="mt-2 space-y-1">
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenList(null);
                    if (locks[part] || !pair) return;
                    change(isProtein ? { ...pair, proteinId: option.id } : { ...pair, sideId: option.id });
                  }}
                  className="tap w-full rounded-lg px-3 text-left hover:bg-surface"
                >
                  {option.label}
                  <span className="ml-2 text-sm text-muted">{`${option.prepMinutes} min`}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <section aria-label="Combinación" className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">{favorite?.title ?? meal?.title ?? protein?.title ?? side?.title}</h2>
      {lockedMismatch && <p className="text-sm text-gold">{LOCKED_MISMATCH_TEXT}</p>}
      {panel('protein')}
      {panel('side')}
      <button
        type="button"
        onClick={shuffle}
        className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-sage px-4 font-semibold text-bg"
      >
        <Shuffle aria-hidden="true" size={20} />
        Otra opción
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={favorite !== undefined}
          disabled={!pair}
          onClick={() => void toggleFavorite()}
          className={`${outlined} ${favorite ? 'border-gold text-gold' : 'border-border text-text'}`}
        >
          <Star aria-hidden="true" size={20} fill={favorite ? 'currentColor' : 'none'} />
          Favorito
        </button>
        {saveTo.map((mealType) => (
          <button
            key={mealType}
            type="button"
            disabled={!dateKey || !pair}
            onClick={() => void save(mealType)}
            className={`${outlined} border-border text-text disabled:opacity-50`}
          >
            <Save aria-hidden="true" size={20} />
            {saveLabel ?? `Guardar en ${MEAL_LABELS[mealType].toLowerCase()}`}
          </button>
        ))}
      </div>
      {!dateKey && <p className="text-sm text-muted">Confirmá tu día en Hoy para guardar.</p>}
      <p role="status" className="text-sm text-gold">
        {notice}
      </p>
    </section>
  );
}
