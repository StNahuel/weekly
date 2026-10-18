import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ResolvedMeal } from '../../domain/meals/resolveMeal';
import type { Protein, Side } from '../../domain/schemas/foods.schema';
import { sideLabel } from './sideLabel';
import { formatGrams } from '../../domain/format';
import type { WeightBasis } from '../../domain/types';
import { BASIS_LABELS } from './basisLabels';

type Line = { ingredientId: string; name: string; grams: number; weightBasis: WeightBasis };

export function IngredientLines({ lines }: { lines: readonly Line[] }) {
  return (
    <ul className="mt-1 space-y-0.5 text-base text-muted">
      {lines.map((line, index) => (
        <li key={`${line.ingredientId}-${index}`}>
          {`${line.name} — ${formatGrams(line.grams)} (${BASIS_LABELS[line.weightBasis]})`}
        </li>
      ))}
    </ul>
  );
}

export function ProteinBlock({ protein, meal }: { protein: Protein; meal: ResolvedMeal }) {
  return (
    <div>
      <p className="font-semibold">{protein.title}</p>
      <IngredientLines lines={meal.lines.filter((l) => l.source === 'protein')} />
    </div>
  );
}

export function SideBlock({ side, meal }: { side: Side; meal: ResolvedMeal }) {
  return (
    <div>
      <p className="font-semibold">{sideLabel(side)}</p>
      <IngredientLines lines={meal.soup ? meal.soup.totals : meal.lines.filter((l) => l.source === 'side')} />
      {side.kind === 'soup_ref' && meal.soup && (
        <Link
          to={`/cocinar/${side.soupId}?p=${meal.soup.servings}`}
          aria-label={`Ver receta de ${side.title}`}
          className="tap mt-1 inline-flex items-center gap-2 font-semibold text-sage underline-offset-4 hover:underline"
        >
          <BookOpen aria-hidden="true" size={20} />
          Ver receta
        </Link>
      )}
    </div>
  );
}
