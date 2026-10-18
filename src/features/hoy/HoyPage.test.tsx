import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { renderApp, resetDb } from '../../test/render';

beforeEach(resetDb);

test('after confirming the day, the salmon + leek soup favorite fills dinner', async () => {
  await renderApp();
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

  const dinner = await screen.findByRole('region', { name: 'Cena' });
  expect(screen.queryByText('¿Qué tipo de día vas a tener?')).toBeNull();
  const regions = screen.getAllByRole('region');
  expect(regions.map((r) => within(r).queryByRole('heading', { level: 2 })?.textContent).filter(Boolean)).toEqual([
    'Desayuno',
    'Almuerzo',
    'Merienda',
    'Cena',
  ]);

  await userEvent.click(within(dinner).getByRole('button', { name: 'Elegir' }));
  const dialog = screen.getByRole('dialog', { name: 'Elegir cena' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Usar Salmón al horno + sopa de puerro y arvejas' }));

  expect(await within(dinner).findByText('Salmón — 220 g (crudo)')).toBeInTheDocument();
  expect(within(dinner).getByText('Sopa Puerro y arvejas (1 porción)')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Cambiar tipo de día' })).toBeInTheDocument();
});
