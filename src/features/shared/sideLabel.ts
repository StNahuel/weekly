import type { Side } from '../../domain/schemas/foods.schema';

export function servingsLabel(servings: number): string {
  return `${servings} ${servings === 1 ? 'porción' : 'porciones'}`;
}

export function soupSlotLabel(title: string, servings: number): string {
  return `Sopa ${title} (${servingsLabel(servings)})`;
}

export function sideLabel(side: Side): string {
  if (side.kind !== 'soup_ref') return side.title;
  return `${side.title} (${servingsLabel(side.defaultServingsForMeal)})`;
}
