import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { BottomNav } from './BottomNav';

const NAMES = ['Hoy', '¿Qué como?', 'Cocinar', 'Comprar', 'Ajustes'];

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
  return within(screen.getByRole('navigation', { name: 'Navegación principal' }));
}

test('five links with their Spanish names', () => {
  const nav = renderAt('/');
  expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual(NAMES);
  for (const name of NAMES) expect(nav.getByRole('link', { name })).toHaveClass('tap');
});

test('only the active section is marked as the current page', () => {
  const nav = renderAt('/comprar');
  expect(nav.getByRole('link', { name: 'Comprar' })).toHaveAttribute('aria-current', 'page');
  expect(nav.getByRole('link', { name: 'Hoy' })).not.toHaveAttribute('aria-current');
});

test('Cocinar stays current on a recipe page', () => {
  const nav = renderAt('/cocinar/miso/cocina');
  expect(nav.getByRole('link', { name: 'Cocinar' })).toHaveAttribute('aria-current', 'page');
});
