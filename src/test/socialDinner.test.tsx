import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../db';
import type { DaySlots, MealSlot } from '../domain/day/slots';
import { seedContext } from '../domain/meals/testHelpers';
import { aggregateGroceries } from '../domain/shopping/aggregate';
import { planToGroceryLines, type PlannedMeal } from '../domain/shopping/planLines';
import { BASIS_LABELS } from '../features/shared/basisLabels';
import { putDay } from '../features/hoy/testDay';
import { groceryGrams } from './groceries';
import { renderApp, resetDb } from './render';

const TUESDAY = new Date('2026-10-20T09:00:00-03:00');
const FIXED: DaySlots = {
  breakfast: { kind: 'template', templateId: 'oats_whey' },
  lunch: { kind: 'combo', proteinId: 'chicken', sideId: 'rice_broccoli' },
  snack: { kind: 'template', templateId: 'yogurt_fruit' },
  dinner: { kind: 'combo', proteinId: 'hake', sideId: 'salad' },
};

const SALMON_VERDE: MealSlot = { kind: 'combo', proteinId: 'salmon', sideId: 'soup_verde' };

function expectedGroceries(meals: readonly PlannedMeal[]): Map<string, number> {
  const items = aggregateGroceries(planToGroceryLines(meals, seedContext())).filter((item) => item.purchasable);
  return new Map(items.map((item) => [`${item.name} · ${BASIS_LABELS[item.weightBasis]}`, Math.round(item.grams * 10) / 10]));
}

const isTuesdayDinner = (meal: PlannedMeal) => meal.date === '2026-10-20' && meal.mealType === 'dinner';

beforeEach(async () => {
  await resetDb();
  await putDay('2026-10-21', 'strength', FIXED);
  await putDay('2026-10-22', 'boxing', FIXED);
});

test('a friends dinner on a boxing day keeps the day type and buys nothing for that dinner', async () => {
  await renderApp({ now: TUESDAY });
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
  const prompt = await screen.findByRole('group', { name: 'Tipo de día' });
  expect(within(prompt).getByRole('button', { name: 'Boxeo' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  let dinner = await screen.findByRole('region', { name: 'Cena' });
  await userEvent.click(within(dinner).getByRole('button', { name: 'Elegir' }));
  await userEvent.click(
    within(screen.getByRole('dialog', { name: 'Elegir cena' })).getByRole('button', {
      name: 'Usar Salmón al horno + sopa de puerro y arvejas',
    }),
  );
  expect(await within(dinner).findByText('Salmón — 220 g (crudo)')).toBeInTheDocument();
  await userEvent.click(within(dinner).getByRole('button', { name: 'Amigos' }));
  expect(await within(dinner).findByText('Cena con amigos — sin plan de comida')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Tipo de día' })).getByText('Boxeo')).toBeInTheDocument();

  await userEvent.click(within(nav).getByRole('link', { name: 'Comprar' }));
  await userEvent.click(await screen.findByRole('button', { name: '3 días' }));
  expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-20');
  await userEvent.click(screen.getByRole('button', { name: 'Armar plan' }));
  await waitFor(async () => expect((await db.shoppingPlans.get('current'))?.meals).toHaveLength(12));
  const friendsMeals = (await db.shoppingPlans.get('current'))?.meals ?? [];
  expect(friendsMeals.find(isTuesdayDinner)?.slot).toEqual({ kind: 'social', social: 'friends' });
  await waitFor(() => expect(groceryGrams()).toEqual(expectedGroceries(friendsMeals)));
  const withFriends = groceryGrams();

  await userEvent.click(within(nav).getByRole('link', { name: 'Hoy' }));
  dinner = await screen.findByRole('region', { name: 'Cena' });
  await userEvent.click(within(dinner).getByRole('button', { name: 'Plan normal' }));
  expect(await within(dinner).findByText('Salmón — 220 g (crudo)')).toBeInTheDocument();

  await userEvent.click(within(nav).getByRole('link', { name: 'Comprar' }));
  await screen.findByRole('button', { name: 'Rearmar plan' });
  await waitFor(() => expect(groceryGrams()).toEqual(withFriends));
  await userEvent.click(screen.getByRole('button', { name: 'Rearmar plan' }));
  await waitFor(() => expect(groceryGrams()).not.toEqual(withFriends));

  const normalMeals = (await db.shoppingPlans.get('current'))?.meals ?? [];
  expect(normalMeals).toEqual(friendsMeals.map((m) => (isTuesdayDinner(m) ? { ...m, slot: SALMON_VERDE } : m)));
  const normal = groceryGrams();
  expect(normal).toEqual(expectedGroceries(normalMeals));
  expect((normal.get('Salmón · crudo') ?? 0) - (withFriends.get('Salmón · crudo') ?? 0)).toBe(220);
});
