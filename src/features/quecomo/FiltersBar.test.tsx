import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { clearDb } from '../../test/db';
import { renderQueComo } from './queComoTestUtils';

const MONDAY_NOON = new Date('2026-10-19T15:00:00Z');

beforeEach(async () => {
  await clearDb();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MONDAY_NOON);
});

afterEach(() => {
  vi.useRealTimers();
});

const sideTitles = () =>
  within(screen.getByRole('list', { name: 'Acompañamientos disponibles' }))
    .getAllByRole('button')
    .map((b) => b.textContent ?? '');

test('the day type defaults to today and 15 min drops every soup side', async () => {
  renderQueComo();
  const strength = await screen.findByRole('button', { name: 'Musculación' });
  expect(strength).toHaveAttribute('aria-pressed', 'true');

  await userEvent.click(screen.getByRole('button', { name: 'Cambiar acompañamiento' }));
  expect(sideTitles().some((t) => t.startsWith('Sopa'))).toBe(true);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tiempo disponible' }), '15');
  expect(sideTitles().length).toBeGreaterThan(0);
  expect(sideTitles().some((t) => t.startsWith('Sopa'))).toBe(false);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tiempo disponible' }), 'Sin límite');
  expect(sideTitles().some((t) => t.startsWith('Sopa'))).toBe(true);
});

test('Solo favoritos narrows a fresh database to the seeded favorite', async () => {
  renderQueComo();
  const toggle = await screen.findByRole('button', { name: 'Solo favoritos' });
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');

  const combo = screen.getByRole('region', { name: 'Combinación' });
  expect(within(combo).getByRole('heading', { level: 2 })).toHaveTextContent(
    /^Salmón al horno \+ sopa de puerro y arvejas$/,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar proteína' }));
  expect(
    within(screen.getByRole('list', { name: 'Proteínas disponibles' }))
      .getAllByRole('button')
      .map((b) => b.textContent),
  ).toEqual(['Salmón al horno25 min']);
});

test('choosing a day type chip switches the filter', async () => {
  renderQueComo();
  await userEvent.click(await screen.findByRole('button', { name: 'Sin tiempo / trabajo' }));
  expect(screen.getByRole('button', { name: 'Sin tiempo / trabajo' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Musculación' })).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar acompañamiento' }));
  expect(sideTitles().some((t) => t.startsWith('Sopa'))).toBe(false);
});
