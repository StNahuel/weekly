import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { DbProvider } from '../app/DbProvider';
import { routes } from '../app/router';
import { db } from '../db';
import { hydrate } from '../db/hydrate';
import { seeds } from '../seed';
import { clearDb } from './db';

export const resetDb = clearDb;

type RenderAppOptions = { route?: string; now?: Date | string; onboarded?: boolean };

export async function renderApp({ route = '/', now, onboarded = true }: RenderAppOptions = {}) {
  if (now !== undefined) vi.setSystemTime(now);
  if (onboarded) {
    await hydrate(db, seeds);
    const profile = await db.profile.get('me');
    if (!profile?.onboardingCompletedAt) await db.profile.update('me', { onboardingCompletedAt: new Date().toISOString() });
  }
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  const view = render(
    <DbProvider>
      <RouterProvider router={router} />
    </DbProvider>,
  );
  return { ...view, router };
}
