import { formatGrams } from '../../domain/format';
import type { ResolvedLine } from '../../domain/recipes/resolve';

export function IngredientList({ lines, label }: { lines: readonly ResolvedLine[]; label?: string }) {
  return (
    <ul aria-label={label} className="space-y-1">
      {lines.map((line) => (
        <li key={line.ingredientId} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1 last:border-0">
          <span>{line.name}</span>
          <span className="shrink-0 font-semibold tabular-nums">{formatGrams(line.grams)}</span>
        </li>
      ))}
    </ul>
  );
}
