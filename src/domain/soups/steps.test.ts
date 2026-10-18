import { describe, expect, test } from 'vitest';
import { ingredientById } from '../../seed/foods';
import { resolveSoup } from './resolveSoup';
import { allVariants } from './testHelpers';

describe('every resolved step is complete', () => {
  test('steps carry text, controls and named gram additions; heated steps carry safety notes', () => {
    for (const { recipe, options } of allVariants()) {
      for (const step of resolveSoup(recipe, options, ingredientById).steps) {
        const label = `${recipe.id} step ${step.step} ${JSON.stringify(options)}`;
        expect(step.title, label).not.toBe('');
        expect(step.instructions, label).not.toBe('');
        expect(step.sourceSettingsText, label).not.toBe('');
        expect(typeof step.controls.heatOff, label).toBe('boolean');
        for (const addition of step.additions) {
          expect(addition.grams, label).toBeGreaterThan(0);
          expect(addition.name, label).not.toBe('');
        }
        if (!step.controls.heatOff) expect(step.safetyNotes.length, label).toBeGreaterThan(0);
      }
    }
  });
});
