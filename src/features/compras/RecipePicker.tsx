import { Check, Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { BTN_PRIMARY } from '../../app/ui';
import { addShoppingEntry } from '../../db/repo';
import type { ShoppingEntry } from '../../domain/recipes/shopping';
import type { Category } from '../../domain/recipes/types';
import { filterRecipes } from '../../domain/recipes/search';
import { recipes } from '../../seed';
import { CATEGORY_PLURALS } from '../shared/labels';
import { CategoryFilter, RecipeList, RecipeRowContent, SearchField } from '../recetas/RecipeList';

const FOCUSABLE = 'button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])';

export function RecipePicker({ entries, onClose }: { entries: readonly ShoppingEntry[]; onClose: () => void }) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const matches = filterRecipes(recipes, query, category);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialog.current) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-text/30 sm:items-center">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="safe-bottom flex max-h-[92dvh] w-full max-w-xl flex-col gap-3 rounded-t-3xl border border-border bg-bg p-4 shadow-soft sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            Agregar comidas
          </h2>
          <button type="button" onClick={onClose} className={BTN_PRIMARY}>
            <Check aria-hidden="true" size={20} />
            Listo
          </button>
        </div>
        <SearchField value={query} onChange={setQuery} label="Buscar receta o ingrediente" />
        <CategoryFilter value={category} onChange={setCategory} labels={CATEGORY_PLURALS} />
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-2">
          <RecipeList
            recipes={matches}
            emptyHint="Probá con otro nombre o categoría."
            renderRow={(recipe) => {
              const count = entries.filter((e) => e.recipeId === recipe.id).length;
              const entry =
                recipe.kind === 'soupMeal'
                  ? { recipeId: recipe.id, servings: 1, proteinId: recipe.defaultProteinId }
                  : { recipeId: recipe.id, servings: 1 };
              return (
                <button
                  type="button"
                  onClick={() => void addShoppingEntry(entry)}
                  className="tap flex w-full items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2"
                >
                  <RecipeRowContent recipe={recipe} />
                  {count > 0 && (
                    <span className="shrink-0 rounded-full bg-mint px-2 text-sm font-semibold text-mint-ink">{`×${count}`}</span>
                  )}
                  <Plus aria-label="Agregar" size={22} className="shrink-0 text-mint-ink" />
                </button>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
