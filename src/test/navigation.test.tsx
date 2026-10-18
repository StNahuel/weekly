import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { renderApp, resetDb } from './render';

beforeEach(resetDb);

test('each bottom-nav link opens its page', async () => {
  await renderApp({ route: '/' });
  expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument();
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
  for (const [link, heading] of [
    ['¿Qué como?', '¿Qué como?'],
    ['Cocinar', 'Cocinar'],
    ['Comprar', 'Comprar'],
    ['Ajustes', 'Ajustes'],
    ['Hoy', 'Hoy'],
  ] as const) {
    await userEvent.click(within(nav).getByRole('link', { name: link }));
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: link })).toHaveAttribute('aria-current', 'page');
  }
});
