import { RotateCcw } from 'lucide-react';
import { useId, useState } from 'react';
import { saveSoupPrefs, type SoupPrefsPatch } from '../../db/repo';
import type { SoupPrefRecord } from '../../db/types';
import type { Recipe } from '../../domain/schemas/soups.schema';
import type { SoupServings } from '../../domain/soups/types';
import type { BrothType } from '../../domain/types';
import { brothTypeFromDefault } from '../../seed/soups';
import { LEGUME_LABELS } from './copy';
import { resolveForView, servingChoices } from './useRecipeView';

const BROTH_LABELS: Readonly<Record<BrothType, string>> = {
  vegetable_concentrate: 'Vegetal FONDO',
  bone_ready: 'Caldo de huesos FONDO',
};

const OVERRIDE_LABELS: Readonly<Record<BrothType, string>> = {
  vegetable_concentrate: 'Concentrado vegetal FONDO congelado (g, para 3 porciones)',
  bone_ready: 'Caldo de huesos FONDO congelado (g, para 3 porciones)',
};

function overrideOf(prefs: SoupPrefRecord | null, brothType: BrothType): number | undefined {
  return brothType === 'vegetable_concentrate' ? prefs?.concentrateGramsFor3 : prefs?.boneBrothGramsFor3;
}

function overridePatch(brothType: BrothType, grams: number | undefined): SoupPrefsPatch {
  return brothType === 'vegetable_concentrate' ? { concentrateGramsFor3: grams } : { boneBrothGramsFor3: grams };
}

const BOTH_SEPARATE_TEXT = 'Agua y concentrado se pesan por separado, directo a la jarra.';
const BONE_READY_TEXT = 'Es caldo listo para usar, no concentrado: va congelado a la jarra y el agua se pesa aparte.';

type SoupOptionsPanelProps = {
  recipe: Recipe;
  prefs: SoupPrefRecord | null;
  servings: SoupServings;
  onServingsChange: (servings: SoupServings) => void;
};

function defaultFor3(recipe: Recipe, brothType: BrothType): number {
  const { liquids } = resolveForView(recipe, { recipeId: recipe.id, brothType, thaiLegume: 'none' }, 3);
  return brothType === 'vegetable_concentrate' ? liquids.concentrate : liquids.boneBroth;
}

function OverrideInput({ recipe, prefs, brothType }: { recipe: Recipe; prefs: SoupPrefRecord | null; brothType: BrothType }) {
  const inputId = useId();
  const [draft, setDraft] = useState(() => String(overrideOf(prefs, brothType) ?? ''));

  const change = (value: string) => {
    setDraft(value);
    if (value === '') {
      void saveSoupPrefs(recipe.id, overridePatch(brothType, undefined));
      return;
    }
    const grams = Number(value);
    if (Number.isFinite(grams) && grams >= 0) void saveSoupPrefs(recipe.id, overridePatch(brothType, grams));
  };

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-semibold">
        {OVERRIDE_LABELS[brothType]}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          value={draft}
          placeholder={String(defaultFor3(recipe, brothType))}
          onChange={(event) => change(event.target.value)}
          className="tap w-full rounded-xl border border-border bg-surface-2 px-3 text-base"
        />
        <button
          type="button"
          disabled={draft === ''}
          onClick={() => change('')}
          className="tap inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-3 font-semibold disabled:opacity-50"
        >
          <RotateCcw aria-hidden="true" size={20} />
          Restablecer
        </button>
      </div>
    </div>
  );
}

export function SoupOptionsPanel({ recipe, prefs, servings, onServingsChange }: SoupOptionsPanelProps) {
  const name = useId();
  const brothType = prefs?.brothType ?? brothTypeFromDefault(recipe.broth.defaultType);
  const legume = recipe.options.thaiLegume;
  const radio = 'tap flex items-center gap-3 rounded-xl border border-border px-3 has-[:checked]:border-sage';

  return (
    <section aria-label="Opciones de la sopa" className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <p className="text-sm font-semibold">Porciones</p>
        <div role="group" aria-label="Porciones" className="mt-1 grid grid-cols-4 gap-1 rounded-xl border border-border p-1">
          {servingChoices(recipe).map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={choice === servings}
              onClick={() => onServingsChange(choice)}
              className="tap rounded-lg font-semibold text-muted aria-pressed:bg-sage aria-pressed:text-bg"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Caldo</legend>
        {recipe.broth.types.map((type) => (
          <label key={type} className={radio}>
            <input
              type="radio"
              name={`${name}-broth`}
              checked={brothType === type}
              onChange={() => void saveSoupPrefs(recipe.id, { brothType: type })}
              className="h-5 w-5 accent-sage"
            />
            {BROTH_LABELS[type]}
          </label>
        ))}
        <p className="text-sm text-muted">
          {brothType === 'vegetable_concentrate'
            ? [recipe.broth.referenceVegetableMix, recipe.broth.waterAndConcentrateMustBeMeasuredSeparately ? BOTH_SEPARATE_TEXT : '']
                .filter(Boolean)
                .join(' ')
            : recipe.broth.boneBrothIsReadyToUse
              ? BONE_READY_TEXT
              : ''}
        </p>
      </fieldset>

      <OverrideInput key={`${recipe.id}-${brothType}`} recipe={recipe} prefs={prefs} brothType={brothType} />

      {legume?.enabled && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Legumbre opcional</legend>
          {legume.choices.map((choice) => (
            <label key={choice} className={radio}>
              <input
                type="radio"
                name={`${name}-legume`}
                checked={(prefs?.thaiLegume ?? legume.default) === choice}
                onChange={() => void saveSoupPrefs(recipe.id, { thaiLegume: choice })}
                className="h-5 w-5 accent-sage"
              />
              {LEGUME_LABELS[choice]}
            </label>
          ))}
        </fieldset>
      )}
    </section>
  );
}
