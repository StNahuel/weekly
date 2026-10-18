import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../db';
import { hydrate } from '../db/hydrate';
import { addFavorite, saveProfile } from '../db/repo';
import { seeds } from '../seed';
import { putDay } from '../features/hoy/testDay';
import { captureDownloads } from './download';
import { renderApp, resetDb } from './render';
import { getProfile } from './db';

const DAY = '2026-10-19';
const FAVORITE = 'Merluza + ensalada';

async function exportBackup(): Promise<string> {
  await hydrate(db, seeds);
  const profile = await getProfile();
  if (!profile) throw new Error('profile missing');
  await saveProfile({ schedule: { ...profile.schedule, workEnd: '17:30' } });
  await putDay(DAY, 'strength', { dinner: { kind: 'social', social: 'family' } });
  await addFavorite('hake', 'salad', FAVORITE);

  const blobs = captureDownloads();
  const view = await renderApp({ route: '/ajustes' });
  await userEvent.click(await screen.findByRole('button', { name: 'Exportar respaldo (JSON)' }));
  await screen.findByText('Respaldo descargado.');
  view.unmount();
  const [blob] = blobs;
  if (!blob) throw new Error('no download');
  return blob.text();
}

async function uploadIntoEmptyApp(text: string) {
  await resetDb();
  await renderApp({ route: '/ajustes', onboarded: false });
  const input = await screen.findByLabelText('Importar respaldo');
  await userEvent.upload(input, new File([text], 'weekly-backup.json', { type: 'application/json' }));
  return screen.findByRole('dialog', { name: '¿Reemplazar los datos de este dispositivo?' });
}

beforeEach(resetDb);

test('an exported backup restores settings, favorites and days after Reemplazar datos', async () => {
  const dialog = await uploadIntoEmptyApp(await exportBackup());
  expect(dialog).toHaveTextContent('Se reemplazarán: 1 días, 2 favoritos, perfil sí.');
  expect(screen.getByLabelText('Salida del trabajo')).toHaveValue('18:30');

  await userEvent.click(within(dialog).getByRole('button', { name: 'Reemplazar datos' }));
  await waitFor(() => expect(screen.getByLabelText('Salida del trabajo')).toHaveValue('17:30'));
  expect(await screen.findByText(FAVORITE)).toBeInTheDocument();
  expect((await db.days.get(DAY))?.slots.dinner).toEqual({ kind: 'social', social: 'family' });
  expect((await getProfile())?.onboardingCompletedAt).toEqual(expect.any(String));
});

test('Cancelar leaves the empty install untouched', async () => {
  const dialog = await uploadIntoEmptyApp(await exportBackup());
  await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(await db.days.count()).toBe(0);
  expect(await db.favorites.get('fav_user_hake_salad')).toBeUndefined();
  expect((await getProfile())?.schedule.workEnd).toBe('18:30');
  expect(screen.getByLabelText('Salida del trabajo')).toHaveValue('18:30');
});
