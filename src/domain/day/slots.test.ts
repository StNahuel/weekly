import { describe, expect, test } from 'vitest';
import { proteinById, sideById, templateById } from '../../seed/foods';
import { seedCatalogs, seededRng } from '../meals/testHelpers';
import { slotSuitability, suggestSlots, type MealSlot } from './slots';
import { applyDayType } from './today';

const lookup = { proteins: proteinById, sides: sideById, templates: templateById };
const salmonRice: MealSlot = { kind: 'combo', proteinId: 'salmon', sideId: 'rice_broccoli' };

function prepOf(slot: MealSlot): number {
  if (slot.kind !== 'combo') throw new Error(`expected a combo, got ${slot.kind}`);
  const protein = proteinById.get(slot.proteinId);
  const side = sideById.get(slot.sideId);
  if (!protein || !side) throw new Error('unknown combo');
  return Math.max(protein.prepMinutes, side.prepMinutes);
}

describe('suggestSlots', () => {
  test('busy lunch and dinner are 15 minutes or less', () => {
    for (let seed = 0; seed < 20; seed++) {
      const slots = suggestSlots('busy', seedCatalogs, seededRng(seed));
      expect(prepOf(slots.lunch)).toBeLessThanOrEqual(15);
      expect(prepOf(slots.dinner)).toBeLessThanOrEqual(15);
    }
  });

  test('dinner differs from lunch and templates follow the day ranking', () => {
    const slots = suggestSlots('boxing', seedCatalogs, seededRng(7));
    expect(slots.dinner).not.toEqual(slots.lunch);
    expect(slots.breakfast).toEqual({ kind: 'template', templateId: 'yogurt_oats' });
    expect(slots.snack).toEqual({ kind: 'template', templateId: 'yogurt_fruit' });
    expect(suggestSlots('rest', seedCatalogs, seededRng(7)).breakfast).toEqual({
      kind: 'template',
      templateId: 'oats_whey',
    });
  });

  test('excluded ingredients and tags never reach a suggested slot', () => {
    const salmonIn = (slots: ReturnType<typeof suggestSlots>) =>
      [slots.lunch, slots.dinner].some((slot) => slot.kind === 'combo' && slot.proteinId === 'salmon');
    const seeds = Array.from({ length: 40 }, (_, seed) => seed);
    expect(seeds.some((seed) => salmonIn(suggestSlots('rest', seedCatalogs, seededRng(seed))))).toBe(true);
    const dietary = { excludedIngredientIds: ['salmon'], excludedTags: [] };
    expect(seeds.some((seed) => salmonIn(suggestSlots('rest', seedCatalogs, seededRng(seed), dietary)))).toBe(false);
  });

  test('excluded ingredients also skip a template suggestion', () => {
    expect(suggestSlots('rest', seedCatalogs, seededRng(7)).breakfast).toEqual({
      kind: 'template',
      templateId: 'oats_whey',
    });
    const dietary = { excludedIngredientIds: ['whey_powder'], excludedTags: [] };
    const { breakfast } = suggestSlots('rest', seedCatalogs, seededRng(7), dietary);
    expect(breakfast.kind).toBe('template');
    expect(breakfast).not.toEqual({ kind: 'template', templateId: 'oats_whey' });
  });

  test('empty catalogs give empty slots', () => {
    const empty = { ...seedCatalogs, proteins: [], breakfasts: [] };
    const slots = suggestSlots('rest', empty, seededRng(1));
    expect(slots.lunch).toEqual({ kind: 'empty' });
    expect(slots.dinner).toEqual({ kind: 'empty' });
    expect(slots.breakfast).toEqual({ kind: 'empty' });
  });
});

describe('slotSuitability', () => {
  test('a 25-minute combo is slow on a busy day only', () => {
    expect(slotSuitability(salmonRice, 'busy', lookup)).toBe('slow_for_busy');
    expect(slotSuitability(salmonRice, 'strength', lookup)).toBe('ok');
    expect(slotSuitability({ kind: 'combo', proteinId: 'tuna', sideId: 'salad' }, 'busy', lookup)).toBe('ok');
  });

  test('templates, social, skip, empty and unknown ids are ok on a busy day', () => {
    expect(slotSuitability({ kind: 'template', templateId: 'banana_pancakes' }, 'busy', lookup)).toBe('ok');
    expect(slotSuitability({ kind: 'social', social: 'friends' }, 'busy', lookup)).toBe('ok');
    expect(slotSuitability({ kind: 'skip' }, 'busy', lookup)).toBe('ok');
    expect(slotSuitability({ kind: 'free' }, 'busy', lookup)).toBe('ok');
    expect(slotSuitability({ kind: 'soup', soupId: 'papa', servings: 4 }, 'busy', lookup)).toBe('ok');
    expect(slotSuitability({ kind: 'empty' }, 'busy', lookup)).toBe('ok');
    expect(slotSuitability({ kind: 'template', templateId: 'ghost' }, 'busy', lookup)).toBe('ok');
  });

  test('strength to busy keeps chosen meals and only changes the suitability flag', () => {
    const day = {
      date: '2026-10-16',
      dayType: 'strength' as const,
      flexible: false,
      slots: { ...suggestSlots('strength', seedCatalogs, seededRng(3)), lunch: salmonRice },
      confirmedAt: '2026-10-16T12:00:00Z',
    };
    const busy = applyDayType(day, 'busy');
    expect(busy.slots).toBe(day.slots);
    expect(busy.slots.lunch).toEqual(salmonRice);
    expect(slotSuitability(busy.slots.lunch, busy.dayType, lookup)).toBe('slow_for_busy');
    expect(Object.keys(busy).sort()).toEqual(['confirmedAt', 'date', 'dayType', 'flexible', 'slots']);
  });
});
