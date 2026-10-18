import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { savePlan } from '../db/repo';
import { groceryGrams, parseGrams } from './groceries';
import { renderApp, resetDb } from './render';

const EXPECTED = new Map([
  ['Agua', 567],
  ['FONDO vegetal concentrado', 11],
  ['Shiitake', 80],
  ['Miso de soja', 15],
]);

const LINE = /^(.*) — ([\d.,]+) g$/;

function gramsByName(texts: readonly (string | null)[]): Map<string, number> {
  const grams = new Map<string, number>();
  for (const text of texts) {
    const match = LINE.exec(text ?? '');
    const name = match?.[1];
    if (name && EXPECTED.has(name)) grams.set(name, (grams.get(name) ?? 0) + parseGrams(match[2] ?? ''));
  }
  return grams;
}

beforeEach(async () => {
  await resetDb();
  await savePlan({
    id: 'current',
    startDate: '2026-10-19',
    horizonDays: 3,
    meals: [{ date: '2026-10-19', mealType: 'dinner', slot: { kind: 'empty' } }],
    checkedKeys: [],
    removedKeys: [],
    overrides: {},
    updatedAt: '2026-10-19T12:00:00.000Z',
  });
});

test('miso for two shows the same grams in the recipe, every kitchen step and the grocery list', async () => {
  await renderApp({ route: '/cocinar/miso?p=2' });
  const ingredients = await screen.findByRole('region', { name: 'Ingredientes' });
  await waitFor(() => expect(within(ingredients).getByRole('heading', { level: 2 })).toHaveTextContent('2 porciones'));
  const preview = gramsByName(within(ingredients).getAllByRole('listitem').map((li) => li.firstChild?.textContent ?? null));
  expect(preview).toEqual(EXPECTED);

  await userEvent.click(screen.getByRole('button', { name: 'Agregar a la lista de compras' }));
  expect(await screen.findByText('Agregada a la lista de compras')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('link', { name: 'Cocinar paso a paso' }));
  expect(await screen.findByText('2 porciones')).toBeInTheDocument();
  const stepLines: (string | null)[] = [];
  for (;;) {
    const list = screen.queryByRole('list', { name: 'Ingredientes de este paso' });
    if (list) stepLines.push(...within(list).getAllByRole('listitem').map((li) => li.textContent));
    const next = screen.queryByRole('button', { name: 'Siguiente' });
    if (!next) break;
    await userEvent.click(next);
  }
  expect(gramsByName(stepLines)).toEqual(EXPECTED);

  await userEvent.click(screen.getByRole('link', { name: 'Ir a la lista de compras' }));
  await waitFor(() => expect(groceryGrams().size).toBeGreaterThan(0));
  const groceries = groceryGrams();
  expect(groceries.get('FONDO vegetal concentrado · concentrado congelado')).toBe(11);
  expect(groceries.get('Shiitake · crudo o congelado')).toBe(80);
  expect(groceries.get('Miso de soja · listo')).toBe(15);
  expect([...groceries.keys()].some((key) => key.startsWith('Agua'))).toBe(false);
});
