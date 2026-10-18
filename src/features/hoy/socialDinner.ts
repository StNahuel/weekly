import type { MealSlot } from '../../domain/day/slots';

export const lastDinnerKey = (date: string) => `lastDinnerBeforeSocial:${date}`;

export function isRestorable(value: unknown): value is MealSlot {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
  if (value.kind === 'combo') {
    return (
      'proteinId' in value &&
      typeof value.proteinId === 'string' &&
      'sideId' in value &&
      typeof value.sideId === 'string'
    );
  }
  return value.kind === 'template' && 'templateId' in value && typeof value.templateId === 'string';
}
