import { describe, expect, test } from 'vitest';
import type { DayRecord } from '../day/slots';
import { applyDayType } from '../day/today';
import { seedContext } from '../meals/testHelpers';
import { MEAL_TYPES } from '../types';
import { aggregateGroceries } from './aggregate';
import { planToGroceryLines } from './planLines';

const lunch = { kind: 'combo', proteinId: 'chicken', sideId: 'rice_broccoli' } as const;
const soupDinner = { kind: 'combo', proteinId: 'salmon', sideId: 'soup_miso' } as const;

function day(date: string, dinner: DayRecord['slots']['dinner']): DayRecord {
  return {
    date,
    dayType: 'rest',
    flexible: false,
    slots: { breakfast: { kind: 'skip' }, lunch, snack: { kind: 'skip' }, dinner },
    confirmedAt: `${date}T12:00:00Z`,
  };
}

function groceries(days: DayRecord[]) {
  const meals = days.flatMap((d) => MEAL_TYPES.map((mealType) => ({ date: d.date, mealType, slot: d.slots[mealType] })));
  return aggregateGroceries(planToGroceryLines(meals, seedContext()));
}

const plan = [
  day('2026-10-16', soupDinner),
  day('2026-10-17', soupDinner),
  day('2026-10-18', { kind: 'social', social: 'friends' }),
];

describe('three-day shopping plan', () => {
  test('sums repeated dishes and one-serving soups exactly once each', () => {
    const grams = Object.fromEntries(groceries(plan).map((i) => [i.key, i.grams]));
    expect(grams).toEqual({
      'broccoli|raw': 540,
      'chicken_breast|raw': 600,
      'salmon|raw': 440,
      'rice_dry|dry': 195,
      'olive_oil|ready': 15,
      'shiitake|raw_or_frozen': 80,
      'ginger|raw': 7,
      'garlic|raw': 3,
      'spring_onion|raw': 10,
      'miso_soy|ready': 15,
      'fish_sauce|ready': 3,
      'soy_sauce|ready': 3,
      'lime_juice|ready': 13,
      'fondo_veg_concentrate|frozen_concentrate': 11,
    });
  });

  test('the social dinner adds nothing and water is never purchasable', () => {
    const [first, second] = plan;
    if (!first || !second) throw new Error('plan has three days');
    const withSocial = groceries(plan);
    const withSkippedDinner = groceries([first, second, day('2026-10-18', { kind: 'skip' })]);
    const withPlannedDinner = groceries([first, second, day('2026-10-18', soupDinner)]);
    expect(withSocial).toEqual(withSkippedDinner);
    expect(withPlannedDinner.find((i) => i.key === 'salmon|raw')?.grams).toBe(660);
    const shake = day('2026-10-19', { kind: 'skip' });
    const withShake = groceries([{ ...shake, slots: { ...shake.slots, snack: { kind: 'template', templateId: 'whey_banana' } } }]);
    expect(withShake.find((i) => i.ingredientId === 'water')).toMatchObject({ grams: 250, purchasable: false });
    expect(withShake.filter((i) => i.purchasable).map((i) => i.ingredientId)).not.toContain('water');
  });

  test('changing a day type leaves the totals identical', () => {
    const boxing = plan.map((d, i) => (i === 2 ? applyDayType(d, 'boxing') : d));
    expect(boxing[2]?.dayType).toBe('boxing');
    expect(groceries(boxing)).toEqual(groceries(plan));
  });
});
