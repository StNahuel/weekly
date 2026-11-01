import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { filterRecipes, parseFilter, type RecipeFilter } from '../../domain/recipes/search';
import { recipes } from '../../seed';
import { CATEGORY_PLURALS } from '../shared/labels';
import { CategoryFilter, RecipeList, SearchField } from './RecipeList';

const ROW =
  'tap flex items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3 shadow-soft transition-colors duration-150 hover:bg-surface-2';

export default function RecetasPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  // The category lives in the URL so coming back from a recipe keeps the filter.
  const filter = parseFilter(params.get('c'));
  const matches = filterRecipes(recipes, query, filter);
  const soupOnly = filter === 'sopas';

  const setFilter = (next: RecipeFilter | null) =>
    setParams(
      (current) => {
        if (next) current.set('c', next);
        else current.delete('c');
        return current;
      },
      { replace: true },
    );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Recetas</h1>
        <p className="text-muted">{`${recipes.length} preparaciones`}</p>
      </header>
      <SearchField value={query} onChange={setQuery} label="Buscar receta o ingrediente" />
      <CategoryFilter value={filter} onChange={setFilter} labels={CATEGORY_PLURALS} />
      <RecipeList
        recipes={matches}
        emptyHint="Probá con otro nombre, ingrediente o categoría."
        soupOnly={soupOnly}
        renderRow={(recipe, content) => (
          <Link to={`/recetas/${recipe.id}${soupOnly ? '?m=soup' : ''}`} className={ROW}>
            {content}
          </Link>
        )}
      />
    </div>
  );
}
