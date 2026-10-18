import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { soups } from '../../seed/soups';
import { RecipeList } from './RecipeList';

function renderList() {
  render(
    <MemoryRouter>
      <RecipeList recipes={soups.recipes} />
    </MemoryRouter>,
  );
}

test('lists all nine soups with flavor, tag and minutes', () => {
  renderList();
  const items = within(screen.getByRole('list', { name: 'Sopas' })).getAllByRole('listitem');
  expect(items).toHaveLength(9);
  const miso = screen.getByRole('link', { name: /Miso y shiitake/ });
  expect(miso).toHaveAttribute('href', '/cocinar/miso');
  expect(miso).toHaveTextContent('Japonesa · Umami');
  expect(miso).toHaveTextContent('CALDO LIGERO');
  expect(miso).toHaveTextContent('25 min');
});

test('search filters on title and flavor and shows an empty state', async () => {
  renderList();
  const search = screen.getByRole('searchbox', { name: 'Buscar sopa' });
  await userEvent.type(search, 'miso');
  expect(within(screen.getByRole('list', { name: 'Sopas' })).getAllByRole('listitem')).toHaveLength(1);

  await userEvent.clear(search);
  await userEvent.type(search, 'TAILANDESA');
  expect(within(screen.getByRole('list', { name: 'Sopas' })).getAllByRole('listitem')).toHaveLength(2);

  await userEvent.clear(search);
  await userEvent.type(search, 'zzz');
  expect(screen.getByText('No hay resultados.')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Sopas' })).toBeNull();
});
