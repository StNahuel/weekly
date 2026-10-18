import { ChevronRight, Search, Timer } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import type { Recipe } from '../../domain/schemas/soups.schema';
import { rotatingTint } from '../shared/tints';

const normalize = (text: string) => text.toLocaleLowerCase('es');

export function RecipeList({ recipes }: { recipes: readonly Recipe[] }) {
  const [query, setQuery] = useState('');
  const needle = normalize(query.trim());
  const matches = recipes
    .map((recipe, index) => ({ recipe, number: index + 1 }))
    .filter(({ recipe }) => normalize(`${recipe.title} ${recipe.flavor}`).includes(needle));

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 shadow-soft transition-colors duration-150 focus-within:border-sky-ink">
        <Search aria-hidden="true" size={20} className="text-muted" />
        <span className="sr-only">Buscar sopa</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar sopa"
          className="tap w-full bg-transparent text-base outline-none placeholder:text-muted"
        />
      </label>
      {matches.length === 0 ? (
        <Empty title="No hay resultados." hint="Probá con otro nombre o sabor." />
      ) : (
        <ul aria-label="Sopas" className="space-y-3">
          {matches.map(({ recipe, number }) => (
            <li key={recipe.id}>
              <Link
                to={`/cocinar/${recipe.id}`}
                className="tap flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 shadow-soft transition-colors duration-150 hover:bg-surface-2"
              >
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl font-semibold text-butter-ink tabular-nums">
                  {String(number).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{recipe.title}</span>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${rotatingTint(number - 1).fill} ${rotatingTint(number - 1).ink}`}>
                    {recipe.flavor}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span className="rounded-full border border-border px-2 text-xs tracking-wide">{recipe.tag}</span>
                    <span className="inline-flex items-center gap-1">
                      <Timer aria-hidden="true" size={16} />
                      {`${recipe.minutesApprox} min`}
                    </span>
                  </span>
                </span>
                <ChevronRight aria-hidden="true" size={20} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
