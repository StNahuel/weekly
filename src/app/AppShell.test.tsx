import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { expect, test } from 'vitest';
import { DbProvider } from './DbProvider';
import { routes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <DbProvider>
      <RouterProvider router={router} />
    </DbProvider>,
  );
}

test('the shell shows Loading, then the main navigation and the Hoy page at /', async () => {
  renderAt('/');
  expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument();
});

test('main pads for the iPhone notch and side insets as well as the home indicator', async () => {
  renderAt('/');
  await screen.findByRole('heading', { level: 1, name: 'Hoy' });
  const main = screen.getByRole('main');
  for (const inset of ['top', 'right', 'bottom', 'left']) expect(main.className).toContain(`safe-area-inset-${inset}`);
});

test.each([
  ['/que-como', '¿Qué como?'],
  ['/cocinar', 'Cocinar'],
  ['/cocinar/miso', 'Miso y shiitake'],
  ['/cocinar/miso/cocina', 'Miso y shiitake'],
  ['/cocinar/nope', 'Receta no encontrada'],
  ['/comprar', 'Comprar'],
  ['/ajustes', 'Ajustes'],
])('route %s renders its page heading', async (path, heading) => {
  renderAt(path);
  expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
});
