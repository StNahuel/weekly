import type { DayType, MealType } from '../../domain/types';

export type Tint = { readonly fill: string; readonly ink: string; readonly ring: string };

// Full class names so Tailwind's scanner keeps them.
const MINT: Tint = { fill: 'bg-mint', ink: 'text-mint-ink', ring: 'ring-mint-ink' };
const PEACH: Tint = { fill: 'bg-peach', ink: 'text-peach-ink', ring: 'ring-peach-ink' };
const LAVENDER: Tint = { fill: 'bg-lavender', ink: 'text-lavender-ink', ring: 'ring-lavender-ink' };
const SKY: Tint = { fill: 'bg-sky', ink: 'text-sky-ink', ring: 'ring-sky-ink' };
const ROSE: Tint = { fill: 'bg-rose', ink: 'text-rose-ink', ring: 'ring-rose-ink' };
const BUTTER: Tint = { fill: 'bg-butter', ink: 'text-butter-ink', ring: 'ring-butter-ink' };

export const TINTS = { mint: MINT, peach: PEACH, lavender: LAVENDER, sky: SKY, rose: ROSE, butter: BUTTER } as const;

export const MEAL_TINTS: Readonly<Record<MealType, Tint>> = {
  breakfast: PEACH,
  lunch: MINT,
  snack: LAVENDER,
  dinner: SKY,
};

export const DAY_TYPE_TINTS: Readonly<Record<DayType, Tint>> = {
  strength: MINT,
  boxing: PEACH,
  rest: SKY,
  busy: LAVENDER,
  sick: ROSE,
};

const ROTATION: readonly Tint[] = [MINT, PEACH, LAVENDER, SKY, ROSE, BUTTER];

export function rotatingTint(index: number): Tint {
  return ROTATION[index % ROTATION.length] ?? MINT;
}

export function tintChip(tint: Tint, selected: boolean): string {
  return selected
    ? `${tint.fill} ${tint.ink} border-transparent font-semibold ring-2 ${tint.ring}`
    : 'border-border bg-surface text-text';
}
