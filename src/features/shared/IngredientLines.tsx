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
