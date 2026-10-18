import { describe, expect, test } from 'vitest';
import { pickCombo, type Combo } from './shuffle';
import { seededRng } from './testHelpers';

const proteins = [{ id: 'chicken' }, { id: 'salmon' }, { id: 'tofu' }];
const sides = [{ id: 'salad' }, { id: 'rice_broccoli' }, { id: 'soup_verde' }];

function comboOf(result: ReturnType<typeof pickCombo>): Combo {
  if (result.status === 'empty') throw new Error('expected a combo');
  return result.combo;
}

describe('pickCombo', () => {
  test('locked protein only changes the side', () => {
    const rng = seededRng(1);
    const previous = { proteinId: 'salmon', sideId: 'salad' };
    for (let i = 0; i < 20; i++) {
      const combo = comboOf(pickCombo({ proteins, sides, lockedProteinId: 'salmon', previous, rng }));
      expect(combo.proteinId).toBe('salmon');
      expect(combo.sideId).not.toBe('salad');
    }
  });

  test('locked side only changes the protein', () => {
    const rng = seededRng(2);
    const previous = { proteinId: 'chicken', sideId: 'soup_verde' };
    for (let i = 0; i < 20; i++) {
      const combo = comboOf(pickCombo({ proteins, sides, lockedSideId: 'soup_verde', previous, rng }));
      expect(combo.sideId).toBe('soup_verde');
      expect(combo.proteinId).not.toBe('chicken');
    }
  });

  test('both locked returns the locked pair without drawing', () => {
    let draws = 0;
    const rng = () => {
      draws++;
      return 0.5;
    };
    expect(pickCombo({ proteins, sides, lockedProteinId: 'tofu', lockedSideId: 'salad', rng })).toEqual({
      status: 'both_locked',
      combo: { proteinId: 'tofu', sideId: 'salad' },
    });
    expect(draws).toBe(0);
  });

  test('a single pair repeats instead of looping', () => {
    const input = { proteins: [{ id: 'tuna' }], sides: [{ id: 'salad' }], rng: seededRng(3) };
    const first = comboOf(pickCombo(input));
    const second = comboOf(pickCombo({ ...input, previous: first }));
    expect(first).toEqual({ proteinId: 'tuna', sideId: 'salad' });
    expect(second).toEqual(first);
  });

  test('empty pools report which side is missing', () => {
    expect(pickCombo({ proteins, sides: [] })).toEqual({ status: 'empty', reason: 'no_sides' });
    expect(pickCombo({ proteins: [], sides })).toEqual({ status: 'empty', reason: 'no_proteins' });
    expect(pickCombo({ proteins: [], sides: [], lockedProteinId: 'tuna' })).toEqual({
      status: 'empty',
      reason: 'no_sides',
    });
  });

  test('the previous pair is avoided whenever another exists', () => {
    const rng = seededRng(4);
    const input = { proteins: [{ id: 'chicken' }, { id: 'salmon' }], sides: [{ id: 'salad' }] };
    const previous = { proteinId: 'chicken', sideId: 'salad' };
    const picks = Array.from({ length: 100 }, () => comboOf(pickCombo({ ...input, previous, rng })));
    expect(picks.every((c) => c.proteinId === 'salmon')).toBe(true);
    const withoutPrevious = Array.from({ length: 100 }, () => comboOf(pickCombo({ ...input, rng })).proteinId);
    expect(new Set(withoutPrevious)).toEqual(new Set(['chicken', 'salmon']));
  });

  test('rng of 1 stays inside the pool', () => {
    expect(comboOf(pickCombo({ proteins, sides, rng: () => 1 }))).toEqual({ proteinId: 'tofu', sideId: 'soup_verde' });
  });
});
