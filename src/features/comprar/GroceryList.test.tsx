import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLiveQuery } from 'dexie-react-hooks';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import type { MealSlot } from '../../domain/day/slots';
import { seedContext } from '../../domain/meals/testHelpers';
import type { PlannedMeal } from '../../domain/shopping/planLines';
import { resolve } from '../../domain/soups/testHelpers';
import { seeds } from '../../seed';
import { clearDb, getPlan } from '../../test/db';
import { putPlan } from './comprarTestUtils';
import { GroceryList } from './GroceryList';

const SALMON_VERDE: MealSlot = { kind: 'combo', proteinId: 'salmon', sideId: 'soup_verde' };
const twoDinners: PlannedMeal[] = [
  { date: '2026-10-16', mealType: 'dinner', slot: SALMON_VERDE },
  { date: '2026-10-17', mealType: 'dinner', slot: SALMON_VERDE },
];

function LiveList() {
  const plan = useLiveQuery(() => db.shoppingPlans.get('current'));
  return plan ? <GroceryList plan={plan} ctx={seedContext()} /> : null;
}

async function renderList(meals: PlannedMeal[] = twoDinners) {
  await putPlan(meals);
  render(<LiveList />);
  await screen.findByRole('heading', { name: 'Lista de compras' });
}

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
});

test('two salmon + verde dinners sum salmon and peas and hide water', async () => {
  const peasPerServing = resolve('verde', { servings: 1 }).shopping.find((a) => a.ingredientId === 'peas')?.grams;
  expect(peasPerServing).toBe(47);
  await renderList();
  expect(screen.getByRole('checkbox', { name: 'Salmón — 440 g · crudo' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /^Arvejas — 94 g · / })).toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: /^Agua/ })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Pescadería' })).toBeInTheDocument();
});

test('checking an item persists it and updates the counter', async () => {
  await renderList();
  const total = screen.getAllByRole('checkbox').length;
  expect(screen.getByText(`0 de ${total} marcados`)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Salmón — 440 g · crudo' }));
  await waitFor(async () => expect((await getPlan())?.checkedKeys).toEqual(['salmon|raw']));
  expect(await screen.findByText(`1 de ${total} marcados`)).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Salmón — 440 g · crudo' })).toBeChecked();
});

test('Quitar hides an item until the removed items are restored', async () => {
  await renderList();
  await userEvent.click(screen.getByRole('button', { name: 'Quitar Salmón' }));
  await waitFor(() => expect(screen.queryByRole('checkbox', { name: /^Salmón/ })).toBeNull());
  expect((await getPlan())?.removedKeys).toEqual(['salmon|raw']);
  await userEvent.click(screen.getByRole('button', { name: 'Restaurar quitados (1)' }));
  expect(await screen.findByRole('checkbox', { name: 'Salmón — 440 g · crudo' })).toBeInTheDocument();
});

test('tapping the grams edits the amount and can go back to the computed value', async () => {
  await renderList();
  await userEvent.click(screen.getByRole('button', { name: 'Editar cantidad de Salmón' }));
  const input = screen.getByLabelText('Gramos de Salmón');
  await userEvent.clear(input);
  await userEvent.type(input, '500');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByRole('checkbox', { name: 'Salmón — 500 g · crudo' })).toBeInTheDocument();
  expect((await getPlan())?.overrides).toEqual({ 'salmon|raw': 500 });
  expect(screen.getByText('crudo · editado')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Editar cantidad de Salmón' }));
  await userEvent.click(screen.getByRole('button', { name: 'Volver al cálculo' }));
  expect(await screen.findByRole('checkbox', { name: 'Salmón — 440 g · crudo' })).toBeInTheDocument();
  expect((await getPlan())?.overrides).toEqual({});
});

test('an invalid amount is not saved', async () => {
  await renderList();
  await userEvent.click(screen.getByRole('button', { name: 'Editar cantidad de Salmón' }));
  await userEvent.clear(screen.getByLabelText('Gramos de Salmón'));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(screen.getByLabelText('Gramos de Salmón')).toBeInTheDocument();
  expect((await getPlan())?.overrides).toEqual({});
});

test('a plan of only social and skipped meals has nothing to buy', async () => {
  await putPlan([
    { date: '2026-10-16', mealType: 'dinner', slot: { kind: 'social', social: 'friends' } },
    { date: '2026-10-16', mealType: 'lunch', slot: { kind: 'skip' } },
  ]);
  render(<LiveList />);
  expect(await screen.findByText('No hay nada para comprar con este plan.')).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('items are grouped under their store category', async () => {
  await renderList();
  const fish = screen.getByRole('heading', { name: 'Pescadería' }).nextElementSibling;
  expect(fish).not.toBeNull();
  expect(within(fish as HTMLElement).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'))).toEqual([
    'Salmón — 440 g · crudo',
  ]);
});
