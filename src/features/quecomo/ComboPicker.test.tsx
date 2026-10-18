import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import type { Candidates } from '../../domain/meals/filters';
import type { Combo } from '../../domain/meals/shuffle';
import { seedContext } from '../../domain/meals/testHelpers';
import { seeds } from '../../seed';
import { clearDb } from '../../test/db';
import { comboCandidates } from '../shared/candidates';
import { useFavorites } from '../shared/useFavorites';
import { ComboPicker, EMPTY_COMBO_TEXT } from './ComboPicker';

const TODAY = '2026-10-19';
const NO_DIET = { excludedIngredientIds: [], excludedTags: [], notes: '' };
const ALL = comboCandidates({ dayType: 'rest', favoritesOnly: false }, NO_DIET, []);
const EMPTY: Candidates = { proteins: [], sides: [] };

function Harness({ candidates = ALL, initial = null, dateKey = TODAY }: {
  candidates?: Candidates;
  initial?: Combo | null;
  dateKey?: string | null;
}) {
  const [combo, setCombo] = useState<Combo | null>(initial);
  const favorites = useFavorites() ?? [];
  return (
    <MemoryRouter>
      <ComboPicker
        ctx={seedContext()}
        candidates={candidates}
        favorites={favorites}
        combo={combo}
        onComboChange={setCombo}
        dateKey={dateKey}
        saveTo={['lunch', 'dinner']}
      />
    </MemoryRouter>
  );
}

const title = () => screen.getByRole('heading', { level: 2 }).textContent ?? '';
const parts = () => title().split(' + ');

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
  await db.days.put({
    date: TODAY,
    dayType: 'strength',
    flexible: false,
    slots: { breakfast: { kind: 'empty' }, lunch: { kind: 'empty' }, snack: { kind: 'empty' }, dinner: { kind: 'empty' } },
    confirmedAt: `${TODAY}T12:00:00Z`,
  });
});

test('a locked protein survives five shuffles while the side keeps changing', async () => {
  render(<Harness initial={{ proteinId: 'chicken', sideId: 'salad' }} />);
  const lock = screen.getByRole('button', { name: 'Fijar proteína' });
  await userEvent.click(lock);
  expect(lock).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Cambiar proteína' })).toBeDisabled();

  for (let i = 0; i < 5; i += 1) {
    const [, sideBefore] = parts();
    await userEvent.click(screen.getByRole('button', { name: 'Otra opción' }));
    const [protein, side] = parts();
    expect(protein).toBe('Pechuga de pollo a la plancha');
    expect(side).not.toBe(sideBefore);
  }
});

test('both locked keeps the pair and explains why', async () => {
  render(<Harness initial={{ proteinId: 'chicken', sideId: 'salad' }} />);
  await userEvent.click(screen.getByRole('button', { name: 'Fijar proteína' }));
  await userEvent.click(screen.getByRole('button', { name: 'Fijar acompañamiento' }));
  await userEvent.click(screen.getByRole('button', { name: 'Otra opción' }));
  expect(title()).toBe('Pechuga de pollo a la plancha + Ensalada verde completa');
  expect(screen.getByRole('status')).toHaveTextContent('Proteína y acompañamiento están fijos.');
});

test('no candidates shows the empty message, also when shuffling a kept combo', async () => {
  const { unmount } = render(<Harness candidates={EMPTY} />);
  expect(screen.getByText(EMPTY_COMBO_TEXT)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Otra opción' })).toBeNull();
  unmount();

  render(<Harness candidates={EMPTY} initial={{ proteinId: 'chicken', sideId: 'salad' }} />);
  expect(screen.queryByText(EMPTY_COMBO_TEXT)).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Otra opción' }));
  expect(screen.getByRole('status')).toHaveTextContent(EMPTY_COMBO_TEXT);
});

test('Cambiar picks a side by hand and soup sides show one serving and the recipe link', async () => {
  render(<Harness initial={{ proteinId: 'chicken', sideId: 'salad' }} />);
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar acompañamiento' }));
  const list = screen.getByRole('list', { name: 'Acompañamientos disponibles' });
  await userEvent.click(within(list).getByRole('button', { name: /Sopa Miso y shiitake/ }));
  expect(title()).toBe('Pechuga de pollo a la plancha + Sopa Miso y shiitake');
  expect(screen.getByText('Sopa Miso y shiitake (1 porción)')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver receta de Sopa Miso y shiitake' })).toHaveAttribute(
    'href',
    '/cocinar/miso?p=1',
  );
});

test('Favorito adds and removes the pair', async () => {
  render(<Harness initial={{ proteinId: 'chicken', sideId: 'salad' }} />);
  const star = screen.getByRole('button', { name: 'Favorito' });
  expect(star).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(star);
  await waitFor(() => expect(star).toHaveAttribute('aria-pressed', 'true'));
  expect(await db.favorites.get('fav_user_chicken_salad')).toBeDefined();
  await userEvent.click(star);
  await waitFor(() => expect(star).toHaveAttribute('aria-pressed', 'false'));
  expect(await db.favorites.get('fav_user_chicken_salad')).toBeUndefined();
});

test('Guardar en cena writes today’s dinner slot', async () => {
  render(<Harness initial={{ proteinId: 'chicken', sideId: 'salad' }} />);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar en cena' }));
  await waitFor(async () =>
    expect((await db.days.get(TODAY))?.slots.dinner).toEqual({ kind: 'combo', proteinId: 'chicken', sideId: 'salad' }),
  );
  expect((await db.days.get(TODAY))?.slots.lunch).toEqual({ kind: 'empty' });
  expect(screen.getByRole('status')).toHaveTextContent('Guardado en cena.');
});

test('without a confirmed day the save buttons are disabled', () => {
  render(<Harness dateKey={null} />);
  expect(screen.getByRole('button', { name: 'Guardar en almuerzo' })).toBeDisabled();
  expect(screen.getByText('Confirmá tu día en Hoy para guardar.')).toBeInTheDocument();
});
