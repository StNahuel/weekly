import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../db';
import { renderApp, resetDb } from './render';

const MONDAY = new Date('2026-10-19T09:00:00-03:00');
const SLOW_HINT = 'Lleva más de 15 min';

beforeEach(resetDb);

const mealText = (name: string) => {
  const region = screen.getByRole('region', { name });
  return [...region.querySelectorAll('p.font-semibold, li')].map((node) => node.textContent);
};

test('switching Musculación to Sin tiempo keeps the chosen meals and only adds a hint', async () => {
  await renderApp({ now: MONDAY });
  const prompt = await screen.findByRole('group', { name: 'Tipo de día' });
  expect(within(prompt).getByRole('button', { name: 'Musculación' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  const dinner = await screen.findByRole('region', { name: 'Cena' });
  await userEvent.click(within(dinner).getByRole('button', { name: 'Elegir' }));
  await userEvent.click(
    within(screen.getByRole('dialog', { name: 'Elegir cena' })).getByRole('button', {
      name: 'Usar Salmón al horno + sopa de puerro y arvejas',
    }),
  );
  expect(await within(dinner).findByText('Salmón — 220 g (crudo)')).toBeInTheDocument();
  const before = { lunch: mealText('Almuerzo'), dinner: mealText('Cena') };
  const stored = await db.days.get('2026-10-19');
  expect(screen.queryByText(SLOW_HINT)).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Cambiar tipo de día' }));
  await userEvent.click(
    within(screen.getByRole('group', { name: 'Elegí el tipo de día' })).getByRole('button', {
      name: 'Sin tiempo / trabajo',
    }),
  );

  const chip = screen.getByRole('region', { name: 'Tipo de día' });
  expect(await within(chip).findByText('Sin tiempo / trabajo')).toBeInTheDocument();
  expect(await within(dinner).findByText(SLOW_HINT)).toBeInTheDocument();
  expect({ lunch: mealText('Almuerzo'), dinner: mealText('Cena') }).toEqual(before);
  await waitFor(async () => expect((await db.days.get('2026-10-19'))?.dayType).toBe('busy'));
  expect((await db.days.get('2026-10-19'))?.slots).toEqual(stored?.slots);
  expect(document.body).not.toHaveTextContent(/kcal|penaliz|compens/i);
});
