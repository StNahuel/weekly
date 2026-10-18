import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import { addFavorite } from '../../db/repo';
import { seeds } from '../../seed';
import { freshProfile } from './ajustesTestUtils';
import { FavoritesManager } from './FavoritesManager';

beforeEach(async () => {
  await freshProfile();
});

test('the seed favorite is Predeterminado; Quitar removes it and hydrate does not bring it back', async () => {
  await addFavorite('chicken', 'salad', 'Pollo + ensalada');
  render(<FavoritesManager />);
  const preset = (await screen.findByText('Salmón al horno + sopa de puerro y arvejas')).closest('li');
  if (!preset) throw new Error('no row');
  expect(within(preset).getByText('Predeterminado')).toBeInTheDocument();
  const user = screen.getByText('Pollo + ensalada').closest('li');
  if (!user) throw new Error('no row');
  expect(within(user).queryByText('Predeterminado')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Quitar Salmón al horno + sopa de puerro y arvejas' }));
  await waitFor(() => expect(screen.queryByText('Salmón al horno + sopa de puerro y arvejas')).toBeNull());
  await hydrate(db, seeds);
  expect(await db.favorites.get('fav_salmon_leek_peas')).toBeUndefined();

  await userEvent.click(screen.getByRole('button', { name: 'Quitar Pollo + ensalada' }));
  expect(await screen.findByText('No tenés favoritos. Marcalos con la estrella en ¿Qué como?')).toBeInTheDocument();
});
