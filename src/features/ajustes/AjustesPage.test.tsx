import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { renderApp, resetDb } from '../../test/render';

beforeEach(resetDb);

test('Ajustes shows each section and the about text', async () => {
  await renderApp({ route: '/ajustes' });
  expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument();
  for (const name of ['Horarios', 'Objetivos', 'Preferencias', 'Favoritos', 'Respaldo', 'Acerca de']) {
    expect(await screen.findByRole('heading', { level: 2, name })).toBeInTheDocument();
  }
  expect(screen.getByText('Datos solo en este dispositivo. Sin cuentas, sin red, sin seguimiento.')).toBeInTheDocument();
  expect(screen.getByText('Instalar en iPhone: Compartir → Agregar a inicio.')).toBeInTheDocument();
});

test('the large-text preference scales the whole app', async () => {
  await renderApp({ route: '/ajustes' });
  expect(document.documentElement).not.toHaveClass('large-text');
  await userEvent.click(await screen.findByLabelText('Texto más grande'));
  await waitFor(() => expect(document.documentElement).toHaveClass('large-text'));
  await userEvent.click(screen.getByLabelText('Texto más grande'));
  await waitFor(() => expect(document.documentElement).not.toHaveClass('large-text'));
});
