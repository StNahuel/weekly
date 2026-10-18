import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLiveQuery } from 'dexie-react-hooks';
import { beforeEach, expect, test, vi } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import { getRecipe } from '../../domain/soups/testHelpers';
import { seeds } from '../../seed';
import { clearDb } from '../../test/db';
import { SoupOptionsPanel } from './SoupOptions';

function LivePanel({ recipeId, onServingsChange = () => {} }: { recipeId: string; onServingsChange?: (n: number) => void }) {
  const prefs = useLiveQuery(async () => (await db.soupPrefs.get(recipeId)) ?? null, [recipeId]);
  if (prefs === undefined) return null;
  return <SoupOptionsPanel recipe={getRecipe(recipeId)} prefs={prefs} servings={3} onServingsChange={onServingsChange} />;
}

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
});

test('thai offers the legume choice and miso does not', async () => {
  const { unmount } = render(<LivePanel recipeId="thai" />);
  expect(await screen.findByRole('radio', { name: 'Sin legumbre' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Garbanzos' })).not.toBeChecked();
  await userEvent.click(screen.getByRole('radio', { name: 'Edamame' }));
  await waitFor(async () => expect((await db.soupPrefs.get('thai'))?.thaiLegume).toBe('edamame'));
  unmount();

  render(<LivePanel recipeId="miso" />);
  expect(await screen.findByRole('radio', { name: 'Vegetal FONDO' })).toBeChecked();
  expect(screen.queryByRole('radio', { name: 'Sin legumbre' })).toBeNull();
});

test('choosing bone broth persists and an override of 200 g is stored and resettable', async () => {
  render(<LivePanel recipeId="miso" />);
  expect(await screen.findByLabelText('Concentrado vegetal FONDO congelado (g, para 3 porciones)')).toHaveAttribute(
    'placeholder',
    '17',
  );
  expect(screen.getByText(/FONDO referencia 15 g de concentrado por 500 g de agua/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('radio', { name: 'Caldo de huesos FONDO' }));
  await waitFor(async () => expect((await db.soupPrefs.get('miso'))?.brothType).toBe('bone_ready'));
  const bone = await screen.findByLabelText('Caldo de huesos FONDO congelado (g, para 3 porciones)');
  expect(bone).toHaveAttribute('placeholder', '300');
  expect(screen.getByText(/caldo listo para usar, no concentrado/)).toBeInTheDocument();

  await userEvent.type(bone, '200');
  await waitFor(async () => expect((await db.soupPrefs.get('miso'))?.boneBrothGramsFor3).toBe(200));

  await userEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
  await waitFor(async () => expect(await db.soupPrefs.get('miso')).not.toHaveProperty('boneBrothGramsFor3'));
  expect(bone).toHaveValue(null);
});

test('servings buttons report the choice and mark the current one', async () => {
  const onServingsChange = vi.fn();
  render(<LivePanel recipeId="miso" onServingsChange={onServingsChange} />);
  expect(await screen.findByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: '2' }));
  expect(onServingsChange).toHaveBeenCalledWith(2);
});
