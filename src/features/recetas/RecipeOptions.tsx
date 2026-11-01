import { useId } from 'react';
import { CARD, SEGMENTS } from '../../app/ui';
import { saveSoupPrefs } from '../../db/repo';
import { methodChoices, SERVING_CHOICES, type ResolvedRecipe, type SoupPrefs } from '../../domain/recipes/resolve';
import { BROTH_TYPES, type Recipe } from '../../domain/recipes/types';
import { BROTH_HINTS, BROTH_LABELS } from '../shared/labels';

const RADIO =
  'tap flex items-center gap-3 rounded-2xl border border-border px-3 transition-colors duration-150 has-[:checked]:border-mint-ink has-[:checked]:bg-mint has-[:checked]:text-mint-ink';

type RecipeOptionsProps = {
  recipe: Recipe;
  resolved: ResolvedRecipe;
  prefs: SoupPrefs;
  onServingsChange: (servings: number) => void;
  onProteinChange: (proteinId: string) => void;
  onMethodChange: (method: string) => void;
};

export function RecipeOptions({ recipe, resolved, prefs, onServingsChange, onProteinChange, onMethodChange }: RecipeOptionsProps) {
  const name = useId();
  const methods = methodChoices(recipe);
  const optional =
    recipe.kind === 'soupMeal' ? recipe.soup.steps.flatMap((s) => s.additions).find((a) => a.optional) : undefined;

  return (
    <section aria-label="Opciones" className={`space-y-4 ${CARD}`}>
      {methods.length > 1 && (
        <div>
          <p className="text-sm font-semibold">Cómo prepararla</p>
          <div role="group" aria-label="Cómo prepararla" className={`${SEGMENTS} mt-1 grid-cols-2`}>
            {methods.map((choice) => (
              <button
                key={choice.id}
                type="button"
                aria-pressed={choice.id === resolved.method}
                onClick={() => onMethodChange(choice.id)}
                className="tap rounded-full font-semibold text-muted transition-colors duration-150 aria-pressed:bg-sky aria-pressed:text-sky-ink"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold">Porciones</p>
        <div role="group" aria-label="Porciones" className={`${SEGMENTS} mt-1 grid-cols-4`}>
          {SERVING_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={choice === resolved.servings}
              onClick={() => onServingsChange(choice)}
              className="tap rounded-full font-semibold text-muted transition-colors duration-150 aria-pressed:bg-sage aria-pressed:text-mint-ink"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      {recipe.kind === 'soupMeal' && (
        <>
          {resolved.method === 'meal' && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Proteína</legend>
            <div className="grid grid-cols-2 gap-2">
              {recipe.proteins.map((protein) => (
                <label key={protein.id} className={RADIO}>
                  <input
                    type="radio"
                    name={`${name}-protein`}
                    checked={resolved.protein?.id === protein.id}
                    onChange={() => onProteinChange(protein.id)}
                    className="h-5 w-5 accent-mint-ink"
                  />
                  {protein.title}
                </label>
              ))}
            </div>
          </fieldset>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Caldo</legend>
            {BROTH_TYPES.map((type) => (
              <label key={type} className={RADIO}>
                <input
                  type="radio"
                  name={`${name}-broth`}
                  checked={prefs.brothType === type}
                  onChange={() => void saveSoupPrefs(recipe.soup, { brothType: type })}
                  className="h-5 w-5 accent-mint-ink"
                />
                {BROTH_LABELS[type]}
              </label>
            ))}
            <p className="text-sm text-muted">{BROTH_HINTS[prefs.brothType]}</p>
          </fieldset>

          {optional && (
            <label className={RADIO}>
              <input
                type="checkbox"
                checked={prefs.includeOptional}
                onChange={(event) => void saveSoupPrefs(recipe.soup, { includeOptional: event.target.checked })}
                className="h-5 w-5 accent-mint-ink"
              />
              {`Agregar ${optional.name.toLocaleLowerCase('es')} (opcional)`}
            </label>
          )}
        </>
      )}
    </section>
  );
}
