import { BTN_PRIMARY, BTN_SECONDARY, CALLOUT } from '../../app/ui';
import type { Weekday } from '../../domain/types';

export { CARD, FIELD } from '../../app/ui';

export const WEEKDAY_LABELS: Readonly<Record<Weekday, string>> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export const PRIMARY = `${BTN_PRIMARY} w-full`;
export const SECONDARY = BTN_SECONDARY;
export const ALERT = CALLOUT;
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
