import { Lock, LockOpen, Pencil, Save, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BTN_PRIMARY, BTN_SECONDARY, CALLOUT, OPTION_BUTTON, SECTION_LABEL, TOGGLE } from '../../app/ui';
import type { DietaryExclusions, LunchSlot, MealSlot } from '../../domain/day/slots';
import { formatGrams } from '../../domain/format';
import {
  composeLunch,
  reconcileLunch,
  referenceGrams,
  rollLunch,
  type LunchLocks,
  type LunchPart,
  type LunchPools,
} from '../../domain/meals/lunch';
import { resolveLunch, type MealContext } from '../../domain/meals/resolveSlot';
import type { Template } from '../../domain/schemas/foods.schema';
import { foods, lunchById, swaps } from '../../seed/foods';
import { IngredientLines } from '../shared/IngredientLines';
import { allowedIds, allowedTemplates } from './candidates';
import { BOTH_LOCKED_TEXT, lockedMismatchText, noOptionsText, PART_LABELS } from './labels';

type LunchBuilderProps = {
  slot: MealSlot;
  ctx: MealContext;
  dietary: DietaryExclusions;
  onSave: (slot: MealSlot) => Promise<void>;
};

const PARTS: readonly { part: LunchPart; pool: keyof LunchPools }[] = [
  { part: 'protein', pool: 'proteins' },
  { part: 'carb', pool: 'carbs' },
];

function initialDraft(slot: MealSlot, first: Template | undefined): LunchSlot | null {
  if (slot.kind === 'lunch') return slot;
  if (slot.kind === 'template') {
    const preset = lunchById.get(slot.templateId);
    if (preset) return composeLunch(preset, swaps, slot.gramOverrides);
  }
  const fallback = first ?? foods.lunches[0];
  return fallback ? composeLunch(fallback, swaps) : null;
}

function withPart(slot: LunchSlot, part: LunchPart, id: string): LunchSlot {
  if (part === 'protein') {
    return id === slot.proteinId ? slot : { ...slot, proteinId: id, proteinGrams: referenceGrams(id, foods) };
  }
  return id === slot.carbId ? slot : { ...slot, carbId: id, carbGrams: referenceGrams(id, foods) };
}

export function LunchBuilder({ slot, ctx, dietary, onSave }: LunchBuilderProps) {
  const presets = allowedTemplates('lunch', dietary);
  const pools = useMemo<LunchPools>(
    () => ({ proteins: allowedIds(swaps.proteins, dietary), carbs: allowedIds(swaps.lunchCarbs, dietary) }),
    [dietary],
  );
  const [draft, setDraft] = useState(() => initialDraft(slot, presets[0]));
  const [locks, setLocks] = useState<LunchLocks>({ protein: false, carb: false });
  const [openPart, setOpenPart] = useState<LunchPart | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const presetList = (
    <section aria-labelledby="lunch-presets" className="space-y-2">
      <h3 id="lunch-presets" className={SECTION_LABEL}>
        Opciones rápidas
      </h3>
      <ul className="space-y-2">
        {presets.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              aria-pressed={slot.kind === 'template' && slot.templateId === preset.id}
              onClick={() => void onSave({ kind: 'template', templateId: preset.id })}
              className={OPTION_BUTTON}
            >
              <span className="font-semibold">{preset.title}</span>
              <span className="shrink-0 text-sm text-muted group-aria-pressed:text-mint-ink">{`${preset.prepMinutes} min`}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  if (!draft) return presetList;

  // Pools follow live exclusions; unlocked parts outside them are re-picked, locked ones are flagged.
  const { slot: lunch, mismatch } = reconcileLunch(draft, pools, locks, foods);
  const lines = resolveLunch(lunch, ctx).lines;

  const roll = () => {
    setOpenPart(null);
    if (locks.protein && locks.carb) {
      setNotice(BOTH_LOCKED_TEXT);
      return;
    }
    const { slot: next, blocked } = rollLunch(lunch, locks, pools, Math.random, foods);
    setDraft(next);
    setNotice(blocked.length > 0 ? blocked.map(noOptionsText).join(' ') : null);
  };

  return (
    <div className="space-y-5">
      {presetList}
      <section aria-labelledby="lunch-build" className="space-y-3">
        <h3 id="lunch-build" className={SECTION_LABEL}>
          Armar almuerzo
        </h3>
        {PARTS.map(({ part, pool }) => {
          const line = lines.find((l) => l.source === part);
          const currentId = part === 'protein' ? lunch.proteinId : lunch.carbId;
          const locked = locks[part];
          return (
            <div
              key={part}
              role="group"
              aria-label={PART_LABELS[part]}
              className="space-y-2 rounded-2xl border border-border bg-surface p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold">{PART_LABELS[part]}</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={locked}
                    onClick={() => {
                      setLocks({ ...locks, [part]: !locked });
                      if (!locked && openPart === part) setOpenPart(null);
                    }}
                    className={TOGGLE}
                  >
                    {locked ? <Lock aria-hidden="true" size={16} /> : <LockOpen aria-hidden="true" size={16} />}
                    {locked ? 'Fijado' : 'Fijar'}
                  </button>
                  <button
                    type="button"
                    aria-expanded={openPart === part}
                    disabled={locked}
                    onClick={() => setOpenPart(openPart === part ? null : part)}
                    className={TOGGLE}
                  >
                    <Pencil aria-hidden="true" size={16} />
                    Cambiar
                  </button>
                </div>
              </div>
              {line && <IngredientLines lines={[line]} />}
              {mismatch.includes(part) && (
                <p className={`${CALLOUT} text-sm`}>{locked ? lockedMismatchText(part) : noOptionsText(part)}</p>
              )}
              {openPart === part && !locked && (
                <ul className="space-y-2">
                  {pools[pool].map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        aria-pressed={id === currentId}
                        onClick={() => {
                          setDraft(withPart(lunch, part, id));
                          setOpenPart(null);
                          setNotice(null);
                        }}
                        className={OPTION_BUTTON}
                      >
                        {ctx.catalog.get(id)?.name ?? id}
                        <span className="shrink-0 text-sm text-muted group-aria-pressed:text-mint-ink">
                          {formatGrams(id === currentId ? (line?.grams ?? 0) : referenceGrams(id, foods))}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <div className="rounded-2xl border border-border bg-surface p-3">
          <h4 className="font-semibold">Verduras y aceite</h4>
          <IngredientLines lines={lines.filter((l) => l.source === 'vegetable' || l.source === 'oil')} />
        </div>
        <p role="status" className="text-sm text-muted empty:hidden">
          {notice}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={roll} className={BTN_SECONDARY}>
            <Shuffle aria-hidden="true" size={20} />
            Otra opción
          </button>
          <button type="button" onClick={() => void onSave(lunch)} className={BTN_PRIMARY}>
            <Save aria-hidden="true" size={20} />
            Guardar en hoy
          </button>
        </div>
      </section>
    </div>
  );
}
