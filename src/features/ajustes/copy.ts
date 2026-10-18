import type { Weekday } from '../../domain/types';

export const WEEKDAY_LABELS: Readonly<Record<Weekday, string>> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export const CARD = 'rounded-2xl border border-border bg-surface p-4';
export const FIELD = 'tap rounded-xl border border-border bg-surface-2 px-3 text-base text-text';
export const PRIMARY = 'tap inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sage px-4 font-semibold text-bg disabled:opacity-60';
export const SECONDARY = 'tap inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 font-semibold';
export const ALERT = 'rounded-xl border border-gold p-3';
export const ONBOARDING_INTRO = 'Confirmá que estos horarios se parecen a los tuyos. Son una guía, no un control.';

// The seed keeps these notes in English; the UI must stay in Spanish.
const SEED_TEXT_ES: Readonly<Record<string, string>> = {
  'When useful to meet protein, not mandatory': 'cuando ayude a llegar a la proteína del día; no es obligatoria.',
  'Do not automate until dose and clinical advice reviewed':
    'la app no lo sugiere; primero hay que revisar la dosis con un profesional.',
  'Depends on fatty fish intake and professional advice':
    'la app no lo sugiere; depende de cuánto pescado graso comas y de consejo profesional.',
};

export function hasSpanishText(text: string): boolean {
  return text in SEED_TEXT_ES;
}

export function seedTextEs(text: string): string {
  return SEED_TEXT_ES[text] ?? text;
}
