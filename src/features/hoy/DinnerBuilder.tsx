import { Lock, LockOpen, Save, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { BTN_PRIMARY, BTN_SECONDARY, OPTION_BUTTON, SECTION_LABEL, TOGGLE } from '../../app/ui';
import { dinnerSlotFromPreset, type DietaryExclusions, type MealSlot } from '../../domain/day/slots';
import { formatGrams } from '../../domain/format';
import { referenceGrams } from '../../domain/meals/lunch';
import { pickDifferent } from '../../domain/meals/pick';
import type { MealContext } from '../../domain/meals/resolveSlot';
import type { DinnerPreset } from '../../domain/schemas/foods.schema';
import type { Recipe } from '../../domain/schemas/soups.schema';
import { foods, swaps } from '../../seed/foods';
import { soups } from '../../seed/soups';
import { BASIS_LABELS } from '../shared/basisLabels';
import { allowedDinners, allowedIds, dinnerPresetForProtein, isDinnerPreset, recipeAllowed } from './candidates';
import { BOTH_LOCKED_TEXT, noOptionsText, PART_LABELS } from './labels';

type DinnerBuilderProps = {
  slot: MealSlot;
  ctx: MealContext;
  dietary: DietaryExclusions;
  onSave: (slot: MealSlot) => Promise<void>;
};

type Draft = { proteinId: string; soupRecipeId: string };
type DinnerPart = 'protein' | 'soup';
type Locks = Record<DinnerPart, boolean>;

function initialDraft(slot: MealSlot, first: DinnerPreset | undefined): Draft | null {
  if (slot.kind === 'dinner') return { proteinId: slot.proteinId, soupRecipeId: slot.soupRecipeId };
  const preset = first ?? foods.dinners[0];
  const proteinId = preset?.proteinIngredients[0]?.ingredientId;
  return preset && proteinId ? { proteinId, soupRecipeId: preset.soupRecipeId } : null;
}

function soupSelectable(recipe: Recipe, proteinId: string): boolean {
  const preset = dinnerPresetForProtein(proteinId);
  return preset?.swapSoupAllowed !== false || preset.soupRecipeId === recipe.id;
}

export function DinnerBuilder({ slot, ctx, dietary, onSave }: DinnerBuilderProps) {
  const presets = allowedDinners(dietary);
  const proteins = allowedIds(swaps.proteins, dietary);
  const recipes = soups.recipes.filter((r) => recipeAllowed(r, dietary));
  const [draft, setDraft] = useState(() => initialDraft(slot, presets[0]));
  const [locks, setLocks] = useState<Locks>({ protein: false, soup: false });
  const [notice, setNotice] = useState<string | null>(null);

  const gramsFor = (proteinId: string) =>
    slot.kind === 'dinner' && slot.proteinId === proteinId
      ? slot.proteinGrams
      : (dinnerPresetForProtein(proteinId)?.proteinIngredients[0]?.grams ?? referenceGrams(proteinId, foods));
  const nameOf = (id: string) => ctx.catalog.get(id)?.name ?? id;

  const presetList = (
    <section aria-labelledby="dinner-presets" className="space-y-2">
      <h3 id="dinner-presets" className={SECTION_LABEL}>
        Opciones rápidas
      </h3>
      <ul className="space-y-2">
        {presets.map((preset) => {
          const protein = preset.proteinIngredients[0];
          const recipe = ctx.recipes.get(preset.soupRecipeId);
          return (
            <li key={preset.id}>
              <button
                type="button"
                aria-pressed={isDinnerPreset(slot, preset)}
                onClick={() => void onSave(dinnerSlotFromPreset(preset))}
                className={OPTION_BUTTON}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{preset.title}</span>
                  {protein && recipe && (
                    <span className="block text-sm text-muted group-aria-pressed:text-mint-ink">
                      {`${nameOf(protein.ingredientId)} ${formatGrams(protein.grams)} + 1 porción de ${recipe.title}`}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );

  if (!draft) return presetList;

  const selectableSoups = recipes.filter((r) => soupSelectable(r, draft.proteinId));
  const draftRecipe = ctx.recipes.get(draft.soupRecipeId);
  const proteinGrams = gramsFor(draft.proteinId);
  const basis = ctx.catalog.get(draft.proteinId)?.weightBasis;

  const roll = () => {
    if (locks.protein && locks.soup) {
      setNotice(BOTH_LOCKED_TEXT);
      return;
    }
    const blocked: DinnerPart[] = [];
    let next = draft;
    if (!locks.protein) {
      const proteinId = pickDifferent(proteins, draft.proteinId, Math.random);
      if (proteinId === null) blocked.push('protein');
      else next = { ...next, proteinId };
    }
    if (!locks.soup) {
      const ids = recipes.filter((r) => soupSelectable(r, next.proteinId)).map((r) => r.id);
      const soupRecipeId = pickDifferent(ids, draft.soupRecipeId, Math.random);
      if (soupRecipeId === null) blocked.push('soup');
      else next = { ...next, soupRecipeId };
    }
    setDraft(next);
    setNotice(blocked.length > 0 ? blocked.map(noOptionsText).join(' ') : null);
  };

  const lockToggle = (part: DinnerPart) => (
    <button
      type="button"
      aria-pressed={locks[part]}
      onClick={() => setLocks({ ...locks, [part]: !locks[part] })}
      className={TOGGLE}
    >
      {locks[part] ? <Lock aria-hidden="true" size={16} /> : <LockOpen aria-hidden="true" size={16} />}
      {locks[part] ? 'Fijado' : 'Fijar'}
    </button>
  );

  return (
    <div className="space-y-5">
      {presetList}
      <section aria-labelledby="dinner-build" className="space-y-3">
        <h3 id="dinner-build" className={SECTION_LABEL}>
          Armar cena
        </h3>
        <div role="group" aria-label={PART_LABELS.protein} className="space-y-2 rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold">{PART_LABELS.protein}</h4>
            {lockToggle('protein')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {proteins.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === draft.proteinId}
                disabled={locks.protein && id !== draft.proteinId}
                onClick={() => {
                  setDraft({ ...draft, proteinId: id });
                  setNotice(null);
                }}
                className={OPTION_BUTTON}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{nameOf(id)}</span>
                  <span className="block text-sm text-muted group-aria-pressed:text-mint-ink">{formatGrams(gramsFor(id))}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div role="group" aria-label={PART_LABELS.soup} className="space-y-2 rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold">{`${PART_LABELS.soup} (1 porción)`}</h4>
            {lockToggle('soup')}
          </div>
          <ul className="space-y-2">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  aria-pressed={recipe.id === draft.soupRecipeId}
                  disabled={!selectableSoups.includes(recipe) || (locks.soup && recipe.id !== draft.soupRecipeId)}
                  onClick={() => {
                    setDraft({ ...draft, soupRecipeId: recipe.id });
                    setNotice(null);
                  }}
                  className={OPTION_BUTTON}
                >
                  {recipe.title}
                  <span className="shrink-0 text-sm text-muted group-aria-pressed:text-mint-ink">{`${recipe.minutesApprox} min`}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {draftRecipe && (
          <p className="font-semibold">
            {`${nameOf(draft.proteinId)} — ${formatGrams(proteinGrams)}${basis ? ` (${BASIS_LABELS[basis]})` : ''} + 1 porción de ${draftRecipe.title}`}
          </p>
        )}
        <p role="status" className="text-sm text-muted empty:hidden">
          {notice}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={roll} className={BTN_SECONDARY}>
            <Shuffle aria-hidden="true" size={20} />
            Otra opción
          </button>
          <button
            type="button"
            disabled={!draftRecipe}
            onClick={() =>
              void onSave({
                kind: 'dinner',
                proteinId: draft.proteinId,
                proteinGrams,
                soupRecipeId: draft.soupRecipeId,
                soupServings: 1,
              })
            }
            className={BTN_PRIMARY}
          >
            <Save aria-hidden="true" size={20} />
            Guardar en hoy
          </button>
        </div>
      </section>
    </div>
  );
}
