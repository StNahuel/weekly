import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import { saveSoupPrefs } from '../../db/repo';
import { seeds } from '../../seed';
import { soups } from '../../seed/soups';
import { clearDb } from '../../test/db';
import { getLine, renderRoute } from './cocinarTestUtils';
import { seedTextEs } from './copy';

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
});

async function stepThrough(): Promise<string[]> {
  const titles: string[] = [];
  for (;;) {
    titles.push(screen.getByRole('heading', { level: 2 }).textContent ?? '');
    const next = screen.queryByRole('button', { name: 'Siguiente' });
    if (!next) return titles;
    await userEvent.click(next);
  }
}

test('thai without legume has six screens and Anterior is disabled on the first', async () => {
  renderRoute('/cocinar/thai/cocina');
  expect(await screen.findByText('Paso 1 de 6')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  const titles = await stepThrough();
  expect(titles).toHaveLength(6);
  expect(titles).not.toContain('Legumbre opcional');
  expect(screen.getByText('Paso 6 de 6')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Terminé' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
});

test('thai with edamame has seven screens and screen six adds 45 g edamame', async () => {
  await saveSoupPrefs('thai', { thaiLegume: 'edamame' });
  renderRoute('/cocinar/thai/cocina');
  expect(await screen.findByText('Paso 1 de 7')).toBeInTheDocument();
  for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Paso 6 de 7')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Legumbre opcional' })).toBeInTheDocument();
  getLine('Edamame cocido — 45 g');
  expect(screen.getByText('5–7 min')).toBeInTheDocument();
});

test('servings come from the query param and done marks survive moving between steps', async () => {
  renderRoute('/cocinar/miso/cocina?p=2');
  expect(await screen.findByText('2 porciones')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Marcar listo' }));
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  getLine('Shiitake — 80 g');
  expect(screen.getByRole('checkbox', { name: 'Marcar listo' })).not.toBeChecked();
  await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect(screen.getByRole('checkbox', { name: 'Marcar listo' })).toBeChecked();
});

test('the hot-jug banner opens by default on the first gradual step only', async () => {
  renderRoute('/cocinar/papa/cocina');
  const hotBlend = seedTextEs(soups.safety.hotBlend);
  await screen.findByText('Paso 1 de 5');
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByRole('button', { name: 'Seguridad con la jarra caliente' })).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Paso 4 de 5')).toBeInTheDocument();
  expect(screen.getByText(hotBlend)).toBeInTheDocument();
});

test('Terminé returns to the recipe with the same servings', async () => {
  renderRoute('/cocinar/sesamo/cocina?p=4');
  await screen.findByText('Paso 1 de 5');
  await stepThrough();
  await userEvent.click(screen.getByRole('button', { name: 'Terminé' }));
  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Sésamo, soja y jengibre' })).toBeInTheDocument());
  expect(screen.getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'true');
});

test('an unknown recipe says so', async () => {
  renderRoute('/cocinar/ghost/cocina');
  expect(await screen.findByRole('heading', { name: 'Receta no encontrada' })).toBeInTheDocument();
});
