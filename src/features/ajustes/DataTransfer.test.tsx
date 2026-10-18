import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { db } from '../../db';
import { buildExport, type WeeklyExport } from '../../db/export';
import { upsertDay } from '../../db/repo';
import { EMPTY_SLOTS } from '../hoy/testDay';
import { captureDownloads } from '../../test/download';
import { freshProfile } from './ajustesTestUtils';
import { DataTransfer } from './DataTransfer';

let fixture: WeeklyExport;

const jsonFile = (text: string) => new File([text], 'respaldo.json', { type: 'application/json' });
const fileInput = () => screen.getByLabelText('Importar respaldo');

beforeEach(async () => {
  await freshProfile();
  await upsertDay({
    date: '2026-10-17',
    dayType: 'rest',
    flexible: false,
    slots: EMPTY_SLOTS,
    confirmedAt: '2026-10-17T12:00:00.000Z',
  });
  fixture = await buildExport(db, new Date('2026-10-17T23:30:00.000Z'));
  await db.days.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('an import shows its summary and changes nothing until Reemplazar datos', async () => {
  render(<DataTransfer />);
  await userEvent.upload(fileInput(), jsonFile(JSON.stringify(fixture)));
  const dialog = await screen.findByRole('dialog', { name: '¿Reemplazar los datos de este dispositivo?' });
  expect(dialog).toHaveTextContent(
    'Se reemplazarán: 1 días, 1 favoritos, perfil sí. Exportado el 17 de octubre de 2026 a las 20:30.',
  );
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  expect(await db.days.count()).toBe(0);

  await userEvent.click(screen.getByRole('button', { name: 'Reemplazar datos' }));
  await waitFor(async () => expect(await db.days.count()).toBe(1));
  expect(screen.getByRole('status')).toHaveTextContent('Datos importados.');
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('Cancelar closes the summary and keeps the data', async () => {
  render(<DataTransfer />);
  await userEvent.upload(fileInput(), jsonFile(JSON.stringify(fixture)));
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('Importación cancelada; no se cambió nada.');
  expect(await db.days.count()).toBe(0);
});

test.each([
  ['{', 'El archivo no es JSON válido.'],
  ['x'.repeat(2_000_001), 'El archivo supera 2 MB.'],
  [JSON.stringify({ app: 'weekly', schemaVersion: 1 }), 'Formato no reconocido: exportedAt'],
])('a bad file shows its error and no summary (%#)', async (text, error) => {
  render(<DataTransfer />);
  await userEvent.upload(fileInput(), jsonFile(text));
  expect(await screen.findByRole('alert')).toHaveTextContent(error);
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('export hands the backup to the download', async () => {
  const blobs = captureDownloads();
  render(<DataTransfer />);
  await userEvent.click(screen.getByRole('button', { name: 'Exportar respaldo (JSON)' }));
  expect(await screen.findByText('Respaldo descargado.')).toBeInTheDocument();
  expect(blobs).toHaveLength(1);
  expect(JSON.parse(await blobs[0]!.text())).toMatchObject({ app: 'weekly', favorites: fixture.favorites });
});

test('a storage failure on export or import is reported and leaves the data as it was', async () => {
  render(<DataTransfer />);
  const transaction = vi.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('quota'));
  await userEvent.click(screen.getByRole('button', { name: 'Exportar respaldo (JSON)' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear el respaldo.');

  await userEvent.upload(fileInput(), jsonFile(JSON.stringify(fixture)));
  transaction.mockRejectedValueOnce(new Error('quota'));
  await userEvent.click(await screen.findByRole('button', { name: 'Reemplazar datos' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo importar el respaldo; tus datos no cambiaron.');
  expect(await db.days.count()).toBe(0);
});
