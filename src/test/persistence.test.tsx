import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../db';
import { renderApp, resetDb } from './render';

const MONDAY = new Date('2026-10-19T09:00:00-03:00');

beforeEach(resetDb);

// Service-worker offline behaviour needs a real browser; this covers what IndexedDB keeps.
test('settings, the confirmed day and a new favorite survive a remount', async () => {
  const first = await renderApp({ route: '/ajustes', now: MONDAY });
  fireEvent.change(await screen.findByLabelText('Salida del trabajo'), { target: { value: '17:30' } });
  await waitFor(async () => expect((await db.profile.get('me'))?.schedule.workEnd).toBe('17:30'));

  const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
  await userEvent.click(within(nav).getByRole('link', { name: 'Hoy' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
  await screen.findByRole('region', { name: 'Cena' });

  await userEvent.click(within(nav).getByRole('link', { name: '¿Qué como?' }));
  const combo = await screen.findByRole('region', { name: 'Combinación' });
  const title = within(combo).getByRole('heading', { level: 2 }).textContent ?? '';
  await userEvent.click(within(combo).getByRole('button', { name: 'Favorito' }));
  await waitFor(async () => expect(await db.favorites.count()).toBe(2));

  first.unmount();
  await renderApp({ route: '/ajustes', now: MONDAY });
  expect(await screen.findByLabelText('Salida del trabajo')).toHaveValue('17:30');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(await screen.findByText(title)).toBeInTheDocument();

  await userEvent.click(within(screen.getByRole('navigation', { name: 'Navegación principal' })).getByRole('link', { name: 'Hoy' }));
  expect(await screen.findByRole('button', { name: 'Cambiar tipo de día' })).toBeInTheDocument();
  expect(screen.queryByText('¿Qué tipo de día vas a tener?')).toBeNull();
  expect(screen.getAllByRole('region', { name: /^(Desayuno|Almuerzo|Merienda|Cena)$/ })).toHaveLength(4);
});
