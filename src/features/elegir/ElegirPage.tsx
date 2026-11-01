import { ArrowRight, Feather, Settings, Shuffle, Timer } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, SEGMENTS, TOGGLE } from '../../app/ui';
import { formatGrams } from '../../domain/format';
import { candidates, pickProtein, pickRecipe } from '../../domain/recipes/random';
import { displayTitle, resolveRecipe } from '../../domain/recipes/resolve';
import { CATEGORIES, type Category, type Recipe } from '../../domain/recipes/types';
import { catalog, recipes } from '../../seed';
import { DeviceChips } from '../shared/DeviceChips';
import { CATEGORY_LABELS, CATEGORY_TINTS, subtypeLabel } from '../shared/labels';
import { recipeSearch } from '../recetas/useRecipeView';
import { SwipeCard } from './SwipeCard';

const PREVIEW_LINES = 6;
const RECENT_MEMORY = 6;
const STORAGE_KEY = 'weekly.elegir';

type Choice = { category: Category; light: boolean };
type Pick = { recipe: Recipe; proteinId: string | null };

function readChoice(): Choice {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof parsed === 'object' && parsed !== null && 'category' in parsed && 'light' in parsed) {
      const category = CATEGORIES.find((c) => c === parsed.category);
      if (category) return { category, light: parsed.light === true };
    }
  } catch {
    // Private mode or blocked storage: fall back to the default.
  }
  return { category: 'principales', light: false };
}

function saveChoice(choice: Choice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Remembering the tab is a convenience only.
  }
}

function draw(choice: Choice, recent: readonly string[]): Pick | null {
  const recipe = pickRecipe(candidates(recipes, choice.category, choice.light), recent);
  if (!recipe) return null;
  return { recipe, proteinId: recipe.kind === 'soupMeal' ? (pickProtein(recipe.proteins)?.id ?? null) : null };
}

function CardBody({ pick }: { pick: Pick }) {
  const { recipe } = pick;
  const resolved = useMemo(
    () =>
      resolveRecipe(
        recipe,
        { servings: 1, brothType: 'vegetable_concentrate', includeOptional: false, ...(pick.proteinId ? { proteinId: pick.proteinId } : {}) },
        catalog,
      ),
    [recipe, pick.proteinId],
  );
  const tint = CATEGORY_TINTS[recipe.category];
  const subtype = recipe.kind === 'plate' ? subtypeLabel(recipe.subtype) : subtypeLabel('caldo_con_proteina');
  const lines = recipe.kind === 'plate' ? resolved.totals.filter((l) => l.ingredientId !== 'water' && l.ingredientId !== 'ice') : resolved.otherLines;
  const hidden = lines.length - PREVIEW_LINES;

  return (
    <article className={`${CARD} min-h-80 overflow-hidden`}>
      <header className={`-mx-4 -mt-4 flex items-center justify-between gap-3 px-4 py-3 ${tint.fill} ${tint.ink}`}>
        <span className="font-semibold">{CATEGORY_LABELS[recipe.category]}</span>
        <span className="text-sm font-semibold">
          {[subtype, resolved.method === 'ichef' ? 'Con iChef' : null].filter(Boolean).join(' · ')}
        </span>
      </header>
      <h2 className="mt-4 text-2xl leading-tight font-semibold">{displayTitle(recipe, resolved.protein)}</h2>
      <p className="mt-2 inline-flex items-center gap-1.5 text-muted">
        <Timer aria-hidden="true" size={18} />
        {`≈ ${String(resolved.minutes)} min`}
      </p>
      <div className="mt-2">
        <DeviceChips devices={resolved.devices} />
      </div>
      <ul aria-label="Ingredientes principales" className="mt-4 space-y-1">
        {lines.slice(0, PREVIEW_LINES).map((line) => (
          <li key={line.ingredientId} className="flex items-baseline justify-between gap-3">
            <span>{line.name}</span>
            <span className="shrink-0 font-semibold tabular-nums">{formatGrams(line.grams)}</span>
          </li>
        ))}
        {recipe.kind === 'soupMeal' && (
          <li className="flex items-baseline justify-between gap-3">
            <span>{`Sopa ${recipe.soup.title}`}</span>
            <span className="shrink-0 font-semibold">1 porción</span>
          </li>
        )}
      </ul>
      {hidden > 0 && <p className="mt-1 text-sm text-muted">{`y ${hidden} ingredientes más`}</p>}
    </article>
  );
}

export default function ElegirPage() {
  const navigate = useNavigate();
  const [choice, setChoice] = useState(readChoice);
  const recent = useRef<Record<string, string[]>>({});
  const [pick, setPick] = useState<Pick | null>(() => draw(choice, []));
  const poolSize = candidates(recipes, choice.category, choice.light).length;
  const memoryKey = `${choice.category}:${String(choice.light)}`;

  const next = (nextChoice: Choice = choice) => {
    const key = `${nextChoice.category}:${String(nextChoice.light)}`;
    const seen = recent.current[key] ?? [];
    if (pick && key === memoryKey) seen.push(pick.recipe.id);
    recent.current[key] = seen.slice(-RECENT_MEMORY);
    setPick(draw(nextChoice, recent.current[key]));
  };

  const change = (nextChoice: Choice) => {
    setChoice(nextChoice);
    saveChoice(nextChoice);
    next(nextChoice);
  };

  const open = () => {
    if (pick) void navigate(`/recetas/${pick.recipe.id}${recipeSearch(1, pick.proteinId)}`);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">¿Qué preparás?</h1>
        <Link
          to="/ajustes"
          aria-label="Ajustes"
          className="tap inline-flex items-center justify-center rounded-full border border-border bg-surface text-muted shadow-soft transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          <Settings aria-hidden="true" size={22} />
        </Link>
      </header>

      <div role="group" aria-label="Tipo de preparación" className={`${SEGMENTS} grid-cols-4`}>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={category === choice.category}
            onClick={() => change({ ...choice, category })}
            className="tap rounded-full px-1 text-sm leading-tight font-semibold text-muted transition-colors duration-150 aria-pressed:bg-butter aria-pressed:text-butter-ink"
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {choice.category === 'principales' && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={choice.light}
            onClick={() => change({ ...choice, light: !choice.light })}
            className={TOGGLE}
          >
            <Feather aria-hidden="true" size={16} />
            Ligero
          </button>
          <span className="text-sm text-muted">
            {choice.light ? 'Sopas con proteína y platos livianos' : 'Todos los almuerzos y cenas'}
          </span>
        </div>
      )}

      {pick ? (
        <>
          <SwipeCard key={`${pick.recipe.id}:${pick.proteinId ?? ''}`} label={displayTitle(pick.recipe, null)} onLeft={() => next()} onRight={open}>
            <CardBody pick={pick} />
          </SwipeCard>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => next()} className={BTN_SECONDARY} disabled={poolSize < 2}>
              <Shuffle aria-hidden="true" size={20} />
              Otra
            </button>
            <button type="button" onClick={open} className={BTN_PRIMARY}>
              Ver preparación
              <ArrowRight aria-hidden="true" size={20} />
            </button>
          </div>
          <p className="text-center text-sm text-muted">
            {`Deslizá a la izquierda para otra y a la derecha para cocinarla · ${poolSize} opciones`}
          </p>
        </>
      ) : (
        <Empty title="No hay recetas para esta elección." hint="Probá sin el filtro Ligero." />
      )}
    </div>
  );
}
