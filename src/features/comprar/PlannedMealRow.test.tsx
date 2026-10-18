import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLiveQuery } from 'dexie-react-hooks';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import type { MealSlot } from '../../domain/day/slots';
import { seedContext } from '../../domain/meals/testHelpers';
import { seeds } from '../../seed';
import { clearDb, getPlan } from '../../test/db';
import { useFavorites } from '../shared/useFavorites';
import { putPlan } from './comprarTestUtils';
import { PlannedMealRow } from './PlannedMealRow';

const NO_DIET = { excludedIngredientIds: [], excludedTags: [], notes: '' };
const SALMON_VERDE: MealSlot = { kind: 'combo', proteinId: 'salmon', sideId: 'soup_verde' };

function LiveRow() {
  const plan = useLiveQuery(() => db.shoppingPlans.get('current'));
  const favorites = useFavorites();
  const meal = plan?.meals[0];
  if (!meal || !favorites) return null;
  return (
    <PlannedMealRow meal={meal} index={0} dayType="rest" ctx={seedContext()} favorites={favorites} dietary={NO_DIET} />
  );
}

async function renderRow(slot: MealSlot) {
  await putPlan([{ date: '2026-10-16', mealType: 'dinner', slot }]);
  render(
    <MemoryRouter>
      <LiveRow />
    </MemoryRouter>,
  );
  return screen.findByRole('region', { name: /^Cena del / });
}

const slotOf = async () => (await getPlan())?.meals[0]?.slot;

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
});

test('Saltar writes a skip slot and shows Sin compras', async () => {
  const row = await renderRow(SALMON_VERDE);
  expect(within(row).getByText('Salmón al horno + Sopa Puerro y arvejas (1 porción)')).toBeInTheDocument();
  expect(within(row).queryByText('Sin compras')).toBeNull();
  await userEvent.click(within(row).getByRole('button', { name: 'Saltar' }));
  await waitFor(async () => expect(await slotOf()).toEqual({ kind: 'skip' }));
  expect(await within(row).findByText('Sin compras')).toBeInTheDocument();
  expect(within(row).getByRole('button', { name: 'Saltar' })).toHaveAttribute('aria-pressed', 'true');
});

test('Social defaults to friends and can switch to family; Libre writes a free slot', async () => {
  const row = await renderRow(SALMON_VERDE);
  await userEvent.click(within(row).getByRole('button', { name: 'Social' }));
  await waitFor(async () => expect(await slotOf()).toEqual({ kind: 'social', social: 'friends' }));
  await userEvent.click(await within(row).findByRole('button', { name: 'Familia' }));
  await waitFor(async () => expect(await slotOf()).toEqual({ kind: 'social', social: 'family' }));
  expect(await within(row).findByText('Comida social con familia')).toBeInTheDocument();

  await userEvent.click(within(row).getByRole('button', { name: 'Libre' }));
  await waitFor(async () => expect(await slotOf()).toEqual({ kind: 'free' }));
  await waitFor(() => expect(within(row).queryByRole('group', { name: 'Con quién' })).toBeNull());
  expect(within(row).getByText('Sin compras')).toBeInTheDocument();
});

test('tapping an active mark again brings back a planned meal', async () => {
  const row = await renderRow({ kind: 'skip' });
  await userEvent.click(within(row).getByRole('button', { name: 'Saltar' }));
  await waitFor(async () => expect((await slotOf())?.kind).toBe('combo'));
});

test('Otra opción swaps the dinner for another combo', async () => {
  const row = await renderRow(SALMON_VERDE);
  await userEvent.click(within(row).getByRole('button', { name: 'Otra opción' }));
  await waitFor(async () => {
    const slot = await slotOf();
    expect(slot?.kind).toBe('combo');
    expect(slot).not.toEqual(SALMON_VERDE);
  });
});

test('Elegir saves the picked favorite into the plan, not into a day', async () => {
  const row = await renderRow({ kind: 'skip' });
  await userEvent.click(within(row).getByRole('button', { name: 'Elegir' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Usar Salmón al horno + sopa de puerro y arvejas' }),
  );
  await waitFor(async () => expect(await slotOf()).toEqual(SALMON_VERDE));
  expect(await db.days.count()).toBe(0);
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('Guardar en el plan from the combo picker writes the shown combo into the plan', async () => {
  const row = await renderRow(SALMON_VERDE);
  await userEvent.click(within(row).getByRole('button', { name: 'Elegir' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar en el plan' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await slotOf())?.kind).toBe('combo');
  expect(await db.days.count()).toBe(0);
});

test('a soup slot is titled with its servings', async () => {
  const row = await renderRow({ kind: 'soup', soupId: 'miso', servings: 2 });
  expect(within(row).getByText('Sopa Miso y shiitake (2 porciones)')).toBeInTheDocument();
});
