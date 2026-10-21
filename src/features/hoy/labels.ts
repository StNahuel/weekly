import type { DayType, MealType, SocialKind } from '../../domain/types';

export const DAY_TYPE_LABELS: Readonly<Record<DayType, string>> = {
  strength: 'Musculación',
  boxing: 'Boxeo',
  rest: 'Descanso',
  busy: 'Sin tiempo / trabajo',
  sick: 'Enfermo / recuperación',
};

export const DAY_TYPE_EFFECTS: Readonly<Record<DayType, string>> = {
  strength: 'Mantené la proteína y sumá carbohidratos alrededor del entrenamiento.',
  boxing: 'Sumá carbohidratos fáciles de digerir antes o después de la clase.',
  rest: 'Comé normal, con la proteína de siempre.',
  busy: 'Priorizá comidas rápidas y prácticas. Saltear el entrenamiento no se castiga.',
  sick: 'Priorizá hidratarte y comidas que te caigan bien. Sin forzar entrenamiento ni restricciones.',
};

export const MEAL_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  snack: 'Merienda',
  dinner: 'Cena',
};

export const MEAL_WITH_ARTICLE: Readonly<Record<MealType, string>> = {
  breakfast: 'el desayuno',
  lunch: 'el almuerzo',
  snack: 'la merienda',
  dinner: 'la cena',
};

export const SOCIAL_LABELS: Readonly<Record<SocialKind, string>> = {
  friends: 'Amigos',
  family: 'Familia',
};

export const SOCIAL_DINNER_TEXT: Readonly<Record<SocialKind, string>> = {
  friends: 'Cena con amigos — sin plan de comida',
  family: 'Cena con familia — sin plan de comida',
};

export type BuilderPart = 'protein' | 'carb' | 'soup';

export const PART_LABELS: Readonly<Record<BuilderPart, string>> = {
  protein: 'Proteína',
  carb: 'Carbohidrato',
  soup: 'Sopa',
};

export const BOTH_LOCKED_TEXT = 'Las dos partes están fijadas; destrabá una para ver otra opción.';

export function lockedMismatchText(part: BuilderPart): string {
  return `${PART_LABELS[part]} fijada fuera de tus preferencias actuales; destrabala para elegir otra.`;
}

export function noOptionsText(part: BuilderPart): string {
  return `No hay otra opción de ${PART_LABELS[part].toLowerCase()} con tus preferencias.`;
}
