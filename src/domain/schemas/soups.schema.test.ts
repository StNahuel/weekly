import { describe, expect, test } from 'vitest';
import raw from '../../../data/soups.json';
import { soupsSchema } from './soups.schema';

describe('soupsSchema', () => {
  test('parses data/soups.json with nine recipes and all three speed modes', () => {
    const soups = soupsSchema.parse(raw);
    expect(soups.recipes).toHaveLength(9);

    const modes = new Set(soups.recipes.flatMap((r) => r.steps.map((s) => s.controls.speed.mode)));
    expect([...modes].sort()).toEqual(['gradual', 'manual', 'numeric']);

    const sesamo = soups.recipes.find((r) => r.id === 'sesamo');
    expect(sesamo?.steps.find((s) => s.step === 5)?.controls.speed.mode).toBe('manual');
  });
});
