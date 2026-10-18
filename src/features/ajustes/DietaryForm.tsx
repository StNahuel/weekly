import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { saveProfile } from '../../db/repo';
import type { ProfileRecord } from '../../db/types';
import { groupByCategory } from '../../domain/shopping/aggregate';
import { foods } from '../../seed/foods';
import { CARD } from './copy';

const TAG_OPTIONS: readonly { tag: string; label: string }[] = [
  { tag: 'occasional', label: 'Comidas ocasionales' },
  { tag: 'higher_fat', label: 'Opciones con más grasa' },
  { tag: 'legumes', label: 'Legumbres' },
];

const EXCLUDABLE = groupByCategory(foods.ingredients.filter((i) => i.category !== 'Líquidos'));

const row = 'tap flex cursor-pointer items-center gap-3 rounded-xl px-2';
const box = 'h-6 w-6 shrink-0 accent-sage';

function toggle(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function DietaryForm({ profile }: { profile: ProfileRecord }) {
  const headingId = useId();
  const listId = useId();
  const [dietary, setDietary] = useState(profile.dietary);
  const [largeText, setLargeText] = useState(profile.device.largeText);
  const [open, setOpen] = useState(false);
  const excludedNames = foods.ingredients.filter((i) => dietary.excludedIngredientIds.includes(i.id)).map((i) => i.name);

  const saveDietary = (next: ProfileRecord['dietary']) => {
    setDietary(next);
    void saveProfile({ dietary: next });
  };

  return (
    <section aria-labelledby={headingId} className={`space-y-4 ${CARD}`}>
      <header>
        <h2 id={headingId} className="text-lg font-semibold">
          Preferencias
        </h2>
        <p className="text-sm text-muted">Lo que marques deja de aparecer en las sugerencias.</p>
      </header>
      <div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="tap flex w-full items-center justify-between gap-2 text-left font-semibold"
        >
          {`Ingredientes que no querés (${dietary.excludedIngredientIds.length})`}
          <ChevronDown aria-hidden="true" size={20} className={open ? 'rotate-180' : ''} />
        </button>
        <p className="text-sm text-muted">{excludedNames.length > 0 ? excludedNames.join(', ') : 'Ninguno'}</p>
        {open && (
          <div id={listId} className="mt-2 space-y-3">
            {EXCLUDABLE.map(({ category, items }) => (
              <fieldset key={category}>
                <legend className="text-sm font-semibold tracking-wide text-muted uppercase">{category}</legend>
                {items.map((ingredient) => (
                  <label key={ingredient.id} className={row}>
                    <input
                      type="checkbox"
                      checked={dietary.excludedIngredientIds.includes(ingredient.id)}
                      onChange={() =>
                        saveDietary({
                          ...dietary,
                          excludedIngredientIds: toggle(dietary.excludedIngredientIds, ingredient.id),
                        })
                      }
                      className={box}
                    />
                    {ingredient.name}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        )}
      </div>
      <fieldset>
        <legend className="font-semibold">Evitar</legend>
        {TAG_OPTIONS.map(({ tag, label }) => (
          <label key={tag} className={row}>
            <input
              type="checkbox"
              checked={dietary.excludedTags.includes(tag)}
              onChange={() => saveDietary({ ...dietary, excludedTags: toggle(dietary.excludedTags, tag) })}
              className={box}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="font-semibold">Pantalla</legend>
        <label className={row}>
          <input
            type="checkbox"
            checked={largeText}
            onChange={() => {
              setLargeText(!largeText);
              void saveProfile({ device: { largeText: !largeText } });
            }}
            className={box}
          />
          Texto más grande
        </label>
      </fieldset>
    </section>
  );
}
