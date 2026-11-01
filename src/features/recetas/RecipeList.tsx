import { ChevronRight, Search, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import { Empty } from '../../app/states/Empty';
import { minutesOf } from '../../domain/recipes/resolve';
import { EXTRA_FILTERS, type RecipeFilter } from '../../domain/recipes/search';
import { CATEGORIES, type Category, type Recipe } from '../../domain/recipes/types';
import { DEVICE_ICONS, DEVICE_LABELS, CATEGORY_TINTS, subtypeLabel } from '../shared/labels';

export function SearchField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 shadow-soft transition-colors duration-150 focus-within:border-sky-ink">
      <Search aria-hidden="true" size={20} className="text-muted" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className="tap w-full bg-transparent text-base outline-none placeholder:text-muted"
      />
    </label>
  );
}

const EXTRA_LABELS: Readonly<Record<(typeof EXTRA_FILTERS)[number], string>> = { sopas: 'Sopas', ichef: 'Con iChef' };

export function CategoryFilter({
  value,
  onChange,
  labels,
}: {
  value: RecipeFilter | null;
  onChange: (value: RecipeFilter | null) => void;
  labels: Readonly<Record<Category, string>>;
}) {
  const chip =
    'tap rounded-full border border-border bg-surface px-3 text-sm font-semibold text-muted transition-colors duration-150 aria-pressed:border-transparent aria-pressed:bg-butter aria-pressed:text-butter-ink';
  return (
    <div role="group" aria-label="Categoría" className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={chip}>
        Todas
      </button>
      {CATEGORIES.map((category) => (
        <button key={category} type="button" aria-pressed={value === category} onClick={() => onChange(category)} className={chip}>
          {labels[category]}
        </button>
      ))}
      {EXTRA_FILTERS.map((filter) => (
        <button key={filter} type="button" aria-pressed={value === filter} onClick={() => onChange(filter)} className={chip}>
          {EXTRA_LABELS[filter]}
        </button>
      ))}
    </div>
  );
}

export function RecipeRowContent({ recipe, soupOnly = false }: { recipe: Recipe; soupOnly?: boolean }) {
  const tint = CATEGORY_TINTS[recipe.category];
  const subtype = recipe.kind === 'plate' ? subtypeLabel(recipe.subtype) : subtypeLabel('caldo_con_proteina');
  return (
    <span className="min-w-0 flex-1">
      <span className="block font-semibold">{recipe.kind === 'soupMeal' ? (soupOnly ? `Sopa ${recipe.soup.title}` : `${recipe.soup.title} + proteína`) : recipe.title}</span>
      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        {subtype && <span className={`rounded-full px-2 text-xs font-semibold ${tint.fill} ${tint.ink}`}>{subtype}</span>}
        <span className="inline-flex items-center gap-1">
          <Timer aria-hidden="true" size={14} />
          {`${String(minutesOf(recipe, soupOnly ? 'soup' : undefined))} min`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {recipe.devices.map((device) => {
            const Icon = DEVICE_ICONS[device];
            return <Icon key={device} aria-label={DEVICE_LABELS[device]} size={16} />;
          })}
        </span>
      </span>
    </span>
  );
}

export function RecipeList({
  recipes,
  renderRow,
  emptyHint,
  soupOnly = false,
}: {
  recipes: readonly Recipe[];
  soupOnly?: boolean;
  renderRow: (recipe: Recipe, content: ReactNode) => ReactNode;
  emptyHint: string;
}) {
  if (recipes.length === 0) return <Empty title="No hay resultados." hint={emptyHint} />;
  return (
    <ul aria-label="Recetas" className="space-y-2">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          {renderRow(
            recipe,
            <>
              <RecipeRowContent recipe={recipe} soupOnly={soupOnly} />
              <ChevronRight aria-hidden="true" size={20} className="shrink-0 text-muted" />
            </>,
          )}
        </li>
      ))}
    </ul>
  );
}
