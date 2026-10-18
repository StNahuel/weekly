import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { db } from '../db';
import { hydrate } from '../db/hydrate';
import { saveProfile } from '../db/repo';
import { suggestSlots, type MealSlot } from '../domain/day/slots';
import { seeds } from '../seed';
import { sideById } from '../seed/foods';
import { SLOT_CATALOGS } from '../features/shared/slotCatalogs';
import { renderApp, resetDb } from './render';

const MONDAY = new Date('2026-10-19T09:00:00-03:00');
const COCONUT_SOUPS = ['soup_thai', 'soup_calabaza', 'soup_boniato'];
const COCONUT_TITLES = COCONUT_SOUPS.map((id) => sideById.get(id)?.title ?? id);

const sideOf = (slot: MealSlot | undefined) => (slot?.kind === 'combo' ? slot.sideId : undefined);
const hasCoconutSoup = (slots: MealSlot[]) => slots.some((slot) => COCONUT_SOUPS.includes(sideOf(slot) ?? ''));

// A constant Math.random that makes the unfiltered Monday suggestion pick a coconut soup for lunch.
const R = Array.from({ length: 1000 }, (_, i) => i / 1000).find((r) =>
  COCONUT_SOUPS.includes(sideOf(suggestSlots('strength', SLOT_CATALOGS, () => r).lunch) ?? ''),
);

async function excludeCoconut(excluded: boolean) {
  await hydrate(db, seeds);
  if (excluded) {
    await saveProfile({ dietary: { excludedIngredientIds: ['coconut_milk_culinary'], excludedTags: [], notes: '' } });
  }
}

beforeEach(resetDb);

afterEach(() => {
  vi.restoreAllMocks();
});

test.each([
  [false, true],
  [true, false],
])('Hoy confirm with coconut excluded=%s suggests a coconut soup=%s', async (excluded, expected) => {
  expect(R).toBeDefined();
  await excludeCoconut(excluded);
  vi.spyOn(Math, 'random').mockReturnValue(R ?? 0);
  await renderApp({ now: MONDAY });
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
  await waitFor(async () => expect(await db.days.get('2026-10-19')).toBeDefined());
  const slots = (await db.days.get('2026-10-19'))?.slots;
  expect(hasCoconutSoup([slots?.lunch, slots?.dinner].filter((s) => s !== undefined))).toBe(expected);
});

test.each([
  [false, true],
  [true, false],
])('¿Qué como? side list with coconut excluded=%s lists coconut soups=%s', async (excluded, expected) => {
  await excludeCoconut(excluded);
  await renderApp({ route: '/que-como', now: MONDAY });
  await userEvent.click(await screen.findByRole('button', { name: 'Cambiar acompañamiento' }));
  const options = within(screen.getByRole('list', { name: 'Acompañamientos disponibles' }))
    .getAllByRole('button')
    .map((button) => button.textContent ?? '');
  expect(options.some((option) => option.startsWith('Sopa Miso y shiitake'))).toBe(true);
  for (const title of COCONUT_TITLES) expect(options.some((option) => option.startsWith(title))).toBe(expected);
});
