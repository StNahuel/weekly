import { describe, expect, test } from 'vitest';
import { formatDateKey, formatDateTime, formatDuration, formatGrams, formatTime } from './format';

describe('format', () => {
  test('formatGrams uses es-UY decimals', () => {
    expect(formatGrams(6.5)).toBe('6,5 g');
    expect(formatGrams(0.2)).toBe('0,2 g');
    expect(formatGrams(567)).toBe('567 g');
  });

  test('formatDateKey names the calendar day of the key in Spanish', () => {
    expect(formatDateKey('2026-10-17')).toBe('sábado, 17 de octubre');
  });

  test('formatDateTime shows Montevideo local time on a 24 h clock', () => {
    expect(formatDateTime('2026-10-17T23:30:00.000Z')).toBe('17 de octubre de 2026 a las 20:30');
  });

  test('formatTime keeps the 24 h value', () => {
    expect(formatTime('18:30')).toBe('18:30');
  });

  test('formatDuration picks minutes or seconds and collapses equal bounds', () => {
    expect(formatDuration([1200, 1380])).toBe('20–23 min');
    expect(formatDuration([900, 900])).toBe('15 min');
    expect(formatDuration([30, 30])).toBe('30 s');
    expect(formatDuration([20, 30])).toBe('20–30 s');
  });
});
