import { ChefHat, Fan, Flame, Hand, type LucideIcon } from 'lucide-react';
import type { BrothType, Category, Device } from '../../domain/recipes/types';

export type Tint = { readonly fill: string; readonly ink: string; readonly ring: string };

// Full class names so Tailwind's scanner keeps them.
export const TINTS = {
  mint: { fill: 'bg-mint', ink: 'text-mint-ink', ring: 'ring-mint-ink' },
  peach: { fill: 'bg-peach', ink: 'text-peach-ink', ring: 'ring-peach-ink' },
  lavender: { fill: 'bg-lavender', ink: 'text-lavender-ink', ring: 'ring-lavender-ink' },
  sky: { fill: 'bg-sky', ink: 'text-sky-ink', ring: 'ring-sky-ink' },
  rose: { fill: 'bg-rose', ink: 'text-rose-ink', ring: 'ring-rose-ink' },
  butter: { fill: 'bg-butter', ink: 'text-butter-ink', ring: 'ring-butter-ink' },
} as const satisfies Record<string, Tint>;

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  desayunos: 'Desayuno',
  principales: 'Almuerzo / Cena',
  meriendas: 'Merienda',
  jugos: 'Jugo',
};

export const CATEGORY_PLURALS: Readonly<Record<Category, string>> = {
  desayunos: 'Desayunos',
  principales: 'Almuerzos y cenas',
  meriendas: 'Meriendas',
  jugos: 'Jugos',
};

export const CATEGORY_TINTS: Readonly<Record<Category, Tint>> = {
  desayunos: TINTS.peach,
  principales: TINTS.mint,
  meriendas: TINTS.lavender,
  jugos: TINTS.sky,
};

const SUBTYPE_LABELS: Readonly<Record<string, string>> = {
  plato: 'Plato',
  caldo_con_proteina: 'Sopa + proteína',
  agua_frutal: 'Agua frutal',
  infusion: 'Infusión',
  mocktail: 'Mocktail',
};

export function subtypeLabel(subtype: string | null): string | null {
  return subtype === null ? null : (SUBTYPE_LABELS[subtype] ?? null);
}

export const DEVICE_LABELS: Readonly<Record<Device, string>> = {
  ichef: 'iChef',
  air_fryer: 'Air fryer',
  hornalla: 'Hornalla',
  sin_coccion: 'Sin cocción',
};

export const DEVICE_ICONS: Readonly<Record<Device, LucideIcon>> = {
  ichef: ChefHat,
  air_fryer: Fan,
  hornalla: Flame,
  sin_coccion: Hand,
};

export const DEVICE_TINTS: Readonly<Record<Device, Tint>> = {
  ichef: TINTS.sky,
  air_fryer: TINTS.peach,
  hornalla: TINTS.rose,
  sin_coccion: TINTS.mint,
};

export const BROTH_LABELS: Readonly<Record<BrothType, string>> = {
  vegetable_concentrate: 'Vegetal FONDO (concentrado)',
  bone_ready: 'Caldo de huesos FONDO (listo)',
};

export const BROTH_HINTS: Readonly<Record<BrothType, string>> = {
  vegetable_concentrate: 'Agua y concentrado se pesan por separado, directo a la jarra.',
  bone_ready: 'Caldo listo para usar, va congelado a la jarra y el agua se pesa aparte. Sin concentrado.',
};
