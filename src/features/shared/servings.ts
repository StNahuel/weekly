export function servingsLabel(servings: number): string {
  return `${servings} ${servings === 1 ? 'porción' : 'porciones'}`;
}

export function soupSlotLabel(title: string, servings: number): string {
  return `Sopa ${title} (${servingsLabel(servings)})`;
}
