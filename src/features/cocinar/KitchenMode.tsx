import { ArrowLeft, Check, ChevronLeft, ChevronRight, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty } from '../../app/states/Empty';
import { Loading } from '../../app/states/Loading';
import { LINK } from '../../app/ui';
import { servingsLabel } from '../shared/sideLabel';
import { MachineNotice } from './MachineNotice';
import { StepCard } from './StepCard';
import { useRecipeView } from './useRecipeView';

const navButton =
  'tap inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-4 text-lg font-semibold transition-colors duration-150 disabled:opacity-40';

export default function KitchenMode() {
  const { recipeId = '' } = useParams();
  const navigate = useNavigate();
  const { recipe, servings, soup } = useRecipeView(recipeId);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());

  if (!recipe) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Receta no encontrada</h1>
        <Empty title="No encontramos esa sopa." />
      </div>
    );
  }
  if (!soup) return <Loading />;

  const total = soup.steps.length;
  const position = Math.min(index, total - 1);
  const step = soup.steps[position];
  if (!step) return <Empty title="Esta receta no tiene pasos." />;
  const recipeUrl = `/cocinar/${recipe.id}?p=${servings}`;
  const doneKey = `${recipe.id}:${servings}:${step.step}`;
  const firstGradual = soup.steps.findIndex((s) => s.controls.speed.mode === 'gradual');
  const last = position === total - 1;

  const toggleDone = () =>
    setDone((current) => {
      const next = new Set(current);
      if (next.has(doneKey)) next.delete(doneKey);
      else next.add(doneKey);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={recipeUrl} className={LINK}>
          <ArrowLeft aria-hidden="true" size={20} />
          Volver a la receta
        </Link>
        <Link to="/comprar" className={LINK}>
          <ShoppingBasket aria-hidden="true" size={20} />
          Ir a la lista de compras
        </Link>
      </div>
      <header>
        <h1 className="text-2xl font-semibold">{recipe.title}</h1>
        <p className="text-muted">{servingsLabel(servings)}</p>
      </header>
      <MachineNotice />
      <StepCard
        key={step.step}
        step={step}
        position={position + 1}
        total={total}
        done={done.has(doneKey)}
        onToggleDone={toggleDone}
        safetyOpen={position === firstGradual}
      />
      <nav
        aria-label="Pasos"
        className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-3 bg-bg/95 py-3"
      >
        <button
          type="button"
          disabled={position === 0}
          onClick={() => setIndex(position - 1)}
          className={`${navButton} border border-border bg-surface hover:bg-surface-2`}
        >
          <ChevronLeft aria-hidden="true" size={20} />
          Anterior
        </button>
        {last ? (
          <button type="button" onClick={() => void navigate(recipeUrl)} className={`${navButton} bg-sage text-mint-ink hover:bg-sage-2 active:bg-sage-2`}>
            <Check aria-hidden="true" size={20} />
            Terminé
          </button>
        ) : (
          <button type="button" onClick={() => setIndex(position + 1)} className={`${navButton} bg-sage text-mint-ink hover:bg-sage-2 active:bg-sage-2`}>
            Siguiente
            <ChevronRight aria-hidden="true" size={20} />
          </button>
        )}
      </nav>
    </div>
  );
}
