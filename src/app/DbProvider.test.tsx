import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { db } from '../db';
import type * as HydrateModule from '../db/hydrate';
import { clearDb } from '../test/db';
import { useDb } from './dbContext';
import { DbProvider } from './DbProvider';
import { routes } from './router';
import { useProfile } from './useProfile';

const control = vi.hoisted(() => ({ failWith: null as Error | null, calls: 0 }));

vi.mock('../db/hydrate', async (importOriginal) => {
  const actual = await importOriginal<typeof HydrateModule>();
  return {
    ...actual,
    hydrate: async (...args: Parameters<typeof actual.hydrate>) => {
      control.calls += 1;
      if (control.failWith) throw control.failWith;
      return actual.hydrate(...args);
    },
  };
});

beforeEach(async () => {
  await clearDb();
  control.failWith = null;
  control.calls = 0;
});

function Probe() {
  const { ready } = useDb();
  const profile = useProfile();
  return <p>{ready ? `listo ${profile?.schedule.workEnd ?? ''}` : 'esperando'}</p>;
}

test('children see ready after hydration and the profile exists', async () => {
  render(
    <DbProvider>
      <Probe />
    </DbProvider>,
  );
  expect(screen.getByText('esperando')).toBeInTheDocument();
  expect(await screen.findByText('listo 18:30')).toBeInTheDocument();
  expect(await db.profile.get('me')).not.toBeUndefined();
  expect(control.calls).toBe(1);
});

test('a hydration failure shows the error state and Reintentar recovers', async () => {
  control.failWith = new Error('Seed foods.json is invalid');
  render(
    <DbProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />
    </DbProvider>,
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Algo falló al cargar los datos.');
  expect(screen.getByText('Seed foods.json is invalid')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Hoy' })).toBeNull();

  control.failWith = null;
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument();
  expect(control.calls).toBe(2);
});

test('useDb outside the provider throws', () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  expect(() => render(<Probe />)).toThrow('useDb must be used inside <DbProvider>');
  vi.restoreAllMocks();
});
