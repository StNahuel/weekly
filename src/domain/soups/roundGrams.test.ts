import { describe, expect, test } from 'vitest';
import { roundGrams } from './roundGrams';

describe('roundGrams', () => {
  test('rounds to whole grams from 10 g up', () => {
    expect(roundGrams(14.6667)).toBe(15);
    expect(roundGrams(283.333)).toBe(283);
  });

  test('rounds to half grams between 1 and 10 g', () => {
    expect(roundGrams(6.6667)).toBe(6.5);
    expect(roundGrams(8.333)).toBe(8.5);
  });

  test('rounds to a tenth below 1 g', () => {
    expect(roundGrams(0.1667)).toBe(0.2);
  });
});
