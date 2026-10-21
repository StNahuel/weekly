import type { MealSlot } from '../../domain/day/slots';

export const lastDinnerKey = (date: string) => `lastDinnerBeforeSocial:${date}`;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number';

export function isRestorable(value: unknown): value is MealSlot {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
  switch (value.kind) {
    case 'template':
      return 'templateId' in value && isString(value.templateId);
    case 'lunch':
      return (
        'presetId' in value &&
        isString(value.presetId) &&
        'proteinId' in value &&
        isString(value.proteinId) &&
        'proteinGrams' in value &&
        isNumber(value.proteinGrams) &&
        'carbId' in value &&
        isString(value.carbId) &&
        'carbGrams' in value &&
        isNumber(value.carbGrams) &&
        'vegetables' in value &&
        Array.isArray(value.vegetables) &&
        'oilGrams' in value &&
        isNumber(value.oilGrams)
      );
    case 'dinner':
      return (
        'proteinId' in value &&
        isString(value.proteinId) &&
        'proteinGrams' in value &&
        isNumber(value.proteinGrams) &&
        'soupRecipeId' in value &&
        isString(value.soupRecipeId) &&
        'soupServings' in value &&
        value.soupServings === 1
      );
    default:
      return false;
  }
}
