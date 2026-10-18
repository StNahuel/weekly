import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { savePlan } from '../../db/repo';
import type { MealSlot } from '../../domain/day/slots';
import { formatDateKey } from '../../domain/format';
import { seedContext } from '../../domain/meals/testHelpers';
import { aggregateGroceries } from '../../domain/shopping/aggregate';
import { planToGroceryLines } from '../../domain/shopping/planLines';
import { clearDb, getPlan } from '../../test/db';
import { renderRoute } from '../cocinar/cocinarTestUtils';

const SALMON_VERDE: MealSlot = { kind: 'combo', proteinId: 'salmon', sideId: 'soup_verde' };

function salmonGrams(): number {
  const box = screen.queryByRole('checkbox', { name: /^Salmón — / });
  if (!box) return 0;
  const match = /— ([\d.]+) g/.exec(box.getAttribute('aria-label') ?? '');
  return Number(match?.[1]?.replace('.', '') ?? NaN);
}

beforeEach(clearDb);

test('create a plan, mark one salmon dinner social and the salmon total drops by 220 g', async () => {
  renderRoute('/comprar');
  expect(await screen.findByRole('heading', { level: 1, name: 'Comprar' })).toBeInTheDocument();
  expect(await screen.findByText(/Todavía no hay plan/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Armar plan' }));
  await waitFor(async () => expect((await getPlan())?.meals).toHaveLength(20));

  const plan = await getPlan();
  if (!plan) throw new Error('plan missing');
  const firstDinner = plan.meals.findIndex((m) => m.mealType === 'dinner');
  const dinnerDate = plan.meals[firstDinner]?.date ?? '';
  const meals = plan.meals.map((m, i) => (i === firstDinner ? { ...m, slot: SALMON_VERDE } : m));
  await savePlan({ ...plan, meals });
  const salmon = aggregateGroceries(planToGroceryLines(meals, seedContext())).find((item) => item.key === 'salmon|raw');
  const before = salmon?.grams ?? NaN;
  expect(before).toBeGreaterThanOrEqual(220);
  await waitFor(() => expect(salmonGrams()).toBe(before));

  expect(screen.queryByRole('region', { name: `Cena del ${formatDateKey(dinnerDate)}` })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Ver plan' }));
  const row = screen.getByRole('region', { name: `Cena del ${formatDateKey(dinnerDate)}` });
  await userEvent.click(within(row).getByRole('button', { name: 'Social' }));

  await waitFor(() => expect(salmonGrams()).toBe(before - 220));
  expect(within(row).getByText('Sin compras')).toBeInTheDocument();
});

test('Reiniciar marcados clears every checked item', async () => {
  renderRoute('/comprar');
  await userEvent.click(await screen.findByRole('button', { name: 'Armar plan' }));
  const [first] = await screen.findAllByRole('checkbox');
  if (!first) throw new Error('no grocery items');
  const reset = screen.getByRole('button', { name: 'Reiniciar marcados' });
  expect(reset).toBeDisabled();
  await userEvent.click(first);
  await waitFor(() => expect(first).toBeChecked());
  await userEvent.click(reset);
  await waitFor(async () => expect((await getPlan())?.checkedKeys).toEqual([]));
  await waitFor(() => expect(first).not.toBeChecked());
  expect(await db.shoppingPlans.count()).toBe(1);
});
