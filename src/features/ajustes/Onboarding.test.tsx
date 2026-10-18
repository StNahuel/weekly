import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { defaults } from '../../seed/defaults';
import { ONBOARDING_INTRO } from './copy';
import { renderApp, resetDb } from '../../test/render';
import { getProfile } from '../../test/db';

beforeEach(resetDb);

test('a fresh database shows onboarding inside Hoy; Listo records it and Hoy continues', async () => {
  await renderApp({ onboarded: false });
  expect(await screen.findByRole('heading', { name: 'Antes de empezar' })).toBeInTheDocument();
  expect(screen.getByText(ONBOARDING_INTRO)).toBeInTheDocument();
  expect(screen.queryByText(defaults.onboarding.copy)).toBeNull();
  expect(screen.getByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('La clase de boxeo (18:00) cae dentro del horario laboral');
  expect(screen.getByRole('heading', { name: 'Preferencias' })).toBeInTheDocument();
  expect(screen.queryByText('¿Qué tipo de día vas a tener?')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
  expect(await screen.findByText('¿Qué tipo de día vas a tener?')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Antes de empezar' })).toBeNull();
  await waitFor(async () => expect((await getProfile())?.onboardingCompletedAt).toEqual(expect.any(String)));
});
