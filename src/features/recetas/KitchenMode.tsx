import { ArrowLeft, Check, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import { Loading } from '../../app/states/Loading';
import { CALLOUT, LINK } from '../../app/ui';
import { servingsLabel } from '../../domain/format';
import type { ResolvedStep, Section } from '../../domain/recipes/resolve';
import { MACHINE_NOTICE } from './copy';
import { StepCard } from './StepCard';
import { recipeSearch, useRecipeView } from './useRecipeView';

const navButton =
  'tap inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-4 text-lg font-semibold transition-colors duration-150 disabled:opacity-40';

type FlatStep = { step: ResolvedStep; section: Section; indexInSection: number };

function sectionLabel(section: Section): string {
  if (section.kind === 'main') return 'Preparación';
  return section.kind === 'soup' ? section.title : `Proteína: ${section.title}`;
}

const sameGroup = (a: FlatStep | undefined, b: FlatStep) =>
  b.step.parallelGroup !== undefined && a?.section === b.section && a.step.parallelGroup === b.step.parallelGroup;

function hintFor(current: FlatStep, flat: readonly FlatStep[], position: number): string | null {
  if (current.section.kind === 'protein' && current.indexInSection === 0) return 'Podés hacerla mientras se cocina la sopa.';
  const previous = flat[position - 1];
  const next = flat[position + 1];
  if (sameGroup(previous, current)) {
    return previous?.step.device === current.step.device ? 'Sigue en paralelo con lo anterior' : 'Mientras tanto, en paralelo';
  }
  // A long job that starts a parallel group: don't wait for it, move on.
  if (next && sameGroup(current, next)) return 'Programala y seguí con el paso siguiente mientras tanto';
  return null;
}

export default function KitchenMode() {
  const { recipeId = '' } = useParams();
  const navigate = useNavigate();
  const { recipe, resolved } = useRecipeView(recipeId);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<ReadonlySet<number>>(() => new Set());

  if (!recipe) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Receta no encontrada</h1>
        <Empty title="No encontramos esa receta." action={<Link to="/recetas" className={LINK}>Ver recetas</Link>} />
      </div>
    );
  }
  if (!resolved) return <Loading />;

  const flat: FlatStep[] = resolved.sections.flatMap((section) =>
    section.steps.map((step, indexInSection) => ({ step, section, indexInSection })),
  );
  const total = flat.length;
  const position = Math.min(index, total - 1);
  const current = flat[position];
  if (!current) return <Empty title="Esta receta no tiene pasos." />;
  const recipeUrl = `/recetas/${recipe.id}${recipeSearch(resolved.servings, resolved.protein?.id, resolved.method)}`;
  const firstHotBlend = flat.findIndex((f) => f.step.machine?.speed.mode === 'gradual');
  const usesIchef = flat.some((f) => f.step.device === 'ichef');
  const last = position === total - 1;

  const goTo = (next: number) => {
    setIndex(next);
    window.scrollTo({ top: 0 });
  };

  const toggleDone = () =>
    setDone((previous) => {
      const next = new Set(previous);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });

  return (
    <div className="space-y-4">
      <Link to={recipeUrl} className={LINK}>
        <ArrowLeft aria-hidden="true" size={20} />
        Volver a la receta
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">{resolved.title}</h1>
        <p className="text-muted">{servingsLabel(resolved.servings)}</p>
      </header>
      {usesIchef && current.step.device === 'ichef' && (
        <p className={`flex gap-2 text-sm ${CALLOUT}`}>
          <Info aria-hidden="true" size={20} className="shrink-0" />
          {MACHINE_NOTICE}
        </p>
      )}
      <StepCard
        key={position}
        step={current.step}
        section={sectionLabel(current.section)}
        position={position + 1}
        total={total}
        hint={hintFor(current, flat, position)}
        done={done.has(position)}
        onToggleDone={toggleDone}
        safetyOpen={position === firstHotBlend}
      />
      <nav
        aria-label="Pasos"
        className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-3 bg-bg/95 py-3"
      >
        <button
          type="button"
          disabled={position === 0}
          onClick={() => goTo(position - 1)}
          className={`${navButton} border border-border bg-surface hover:bg-surface-2`}
        >
          <ChevronLeft aria-hidden="true" size={20} />
          Anterior
        </button>
        {last ? (
          <button
            type="button"
            onClick={() => void navigate(recipeUrl)}
            className={`${navButton} bg-sage text-mint-ink hover:bg-sage-2 active:bg-sage-2`}
          >
            <Check aria-hidden="true" size={20} />
            Terminé
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(position + 1)}
            className={`${navButton} bg-sage text-mint-ink hover:bg-sage-2 active:bg-sage-2`}
          >
            Siguiente
            <ChevronRight aria-hidden="true" size={20} />
          </button>
        )}
      </nav>
    </div>
  );
}
