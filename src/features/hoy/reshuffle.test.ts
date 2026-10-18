import { expect, test } from 'vitest';
import { seededRng } from '../../domain/meals/testHelpers';
import { nextSlot } from './reshuffle';

const NO_DIET = { excludedIngredientIds: [], excludedTags: [], notes: '' };

test('a template slot moves to a different template of the same meal', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const next = nextSlot('snack', { kind: 'template', templateId: 'yogurt_fruit' }, 'rest', NO_DIET, undefined, seededRng(seed));
    expect(next.kind).toBe('template');
    expect(next).not.toEqual({ kind: 'template', templateId: 'yogurt_fruit' });
  }
});

test('a combo slot avoids the previous pair and respects busy prep time', () => {
  const current = { kind: 'combo', proteinId: 'tuna', sideId: 'salad' } as const;
  for (let seed = 1; seed <= 20; seed += 1) {
    const next = nextSlot('dinner', current, 'busy', NO_DIET, undefined, seededRng(seed));
    expect(next.kind).toBe('combo');
    expect(next).not.toEqual(current);
  }
});

test('dietary exclusions that remove every option give an empty slot', () => {
  const diet = { ...NO_DIET, excludedTags: ['quick', 'everyday', 'post_training', 'pre_boxing', 'portable'] };
  expect(nextSlot('snack', { kind: 'empty' }, 'rest', diet)).toEqual({ kind: 'empty' });
  expect(nextSlot('snack', { kind: 'empty' }, 'rest', NO_DIET).kind).toBe('template');

  const noProteins = { ...NO_DIET, excludedTags: ['lean', 'everyday', 'favorite', 'quick', 'occasional', 'vegetarian'] };
  expect(nextSlot('lunch', { kind: 'empty' }, 'rest', noProteins)).toEqual({ kind: 'empty' });
  expect(nextSlot('lunch', { kind: 'empty' }, 'rest', NO_DIET).kind).toBe('combo');
});
