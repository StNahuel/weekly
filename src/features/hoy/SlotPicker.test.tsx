import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { db } from '../../db';
import type { FavoriteRecord } from '../../db/types';
import type { MealSlot } from '../../domain/day/slots';
import { seedContext } from '../../domain/meals/testHelpers';
import type { MealType } from '../../domain/types';
import { clearDb } from '../../test/db';
import { SlotPicker } from './SlotPicker';
import { putDay } from './testDay';

const DATE = '2026-10-19';
const NO_DIET = { excludedIngredientIds: [], excludedTags: [], notes: '' };
const FAVORITE: FavoriteRecord = {
  id: 'fav_salmon_leek_peas',
  proteinId: 'salmon',
  sideId: 'soup_verde',
  title: 'Salmón al horno + sopa de puerro y arvejas',
  source: 'seed',
  createdAt: '2026-10-01T00:00:00Z',
};

function renderPicker(mealType: MealType, slot: MealSlot, onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <button type="button">Elegir</button>
      <SlotPicker
        date={DATE}
        mealType={mealType}
        dayType="strength"
        slot={slot}
        ctx={seedContext()}
        favorites={[FAVORITE]}
        dietary={NO_DIET}
        onClose={onClose}
      />
    </MemoryRouter>,
  );
  return onClose;
}

beforeEach(async () => {
  await clearDb();
  await putDay(DATE, 'strength', { snack: { kind: 'template', templateId: 'whey_banana' } });
});

test('choosing a snack template stores it and closes', async () => {
  const onClose = renderPicker('snack', { kind: 'template', templateId: 'whey_banana' });
  const dialog = screen.getByRole('dialog', { name: 'Elegir merienda' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();

  await userEvent.click(screen.getByRole('button', { name: /Yogur proteico y fruta/ }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect((await db.days.get(DATE))?.slots.snack).toEqual({ kind: 'template', templateId: 'yogurt_fruit' });
});

test('focus stays inside the dialog and Escape closes it', async () => {
  const onClose = renderPicker('snack', { kind: 'empty' });
  const close = screen.getByRole('button', { name: 'Cerrar' });
  await userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: /Panqueques|Barra proteica/ })).toHaveFocus();
  await userEvent.tab();
  expect(close).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});

test('lunch and dinner offer favorites and the combo picker saving into today', async () => {
  const onClose = renderPicker('dinner', { kind: 'combo', proteinId: 'chicken', sideId: 'salad' });
  expect(screen.getByRole('heading', { name: 'Favoritos' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar en hoy' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect((await db.days.get(DATE))?.slots.dinner).toEqual({ kind: 'combo', proteinId: 'chicken', sideId: 'salad' });
});
