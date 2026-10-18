import { expect, test } from 'vitest';
import { soups } from '../../seed/soups';
import { hasSpanishText, seedTextEs } from './copy';

test('every English seed note shown in the UI has a Spanish text', () => {
  const shown = [soups.safety.hotBlend, soups.safety.vapor, ...soups.recipes.flatMap((r) => r.provenance.adaptations)];
  expect(shown.filter((text) => !hasSpanishText(text))).toEqual([]);
});

test('text without a translation is returned unchanged', () => {
  expect(seedTextEs('Texto ya en castellano')).toBe('Texto ya en castellano');
});
