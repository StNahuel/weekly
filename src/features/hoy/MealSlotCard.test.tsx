import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import type { MealSlot } from '../../domain/day/slots';
import { seedContext } from '../../domain/meals/testHelpers';
import type { DayType, MealType } from '../../domain/types';
import { clearDb } from '../../test/db';
import { EMPTY_SLOT_TEXT, FREE_SLOT_TEXT, MealSlotCard } from './MealSlotCard';
import { putDay } from './testDay';

const DATE = '2026-10-19';
const NO_DIET = { excludedIngredientIds: [], excludedTags: [], notes: '' };
const SALMON_RICE: MealSlot = { kind: 'combo', proteinId: 'salmon', sideId: 'rice_broccoli' };

function renderCard(slot: MealSlot, { mealType = 'dinner', dayType = 'strength' }: { mealType?: MealType; dayType?: DayType } = {}) {
  return render(
    <MemoryRouter>
      <MealSlotCard
        date={DATE}
        mealType={mealType}
        time="20:30"
        slot={slot}
        dayType={dayType}
        ctx={seedContext()}
        favorites={[]}
        dietary={NO_DIET}
      />
    </MemoryRouter>,
  );
}

beforeEach(clearDb);

test('a combo shows label, time and each ingredient with grams and weight basis', () => {
  renderCard(SALMON_RICE);
  expect(screen.getByRole('heading', { name: 'Cena' })).toBeInTheDocument();
  expect(screen.getByText('20:30')).toBeInTheDocument();
  expect(screen.getByText('Salmón — 220 g (crudo)')).toBeInTheDocument();
  expect(screen.getByText('Arroz — 65 g (seco)')).toBeInTheDocument();
  expect(screen.queryByText('Lleva más de 15 min')).toBeNull();
});

test('a slow combo on a busy day carries the hint', () => {
  renderCard(SALMON_RICE, { dayType: 'busy' });
  expect(screen.getByText('Lleva más de 15 min')).toBeInTheDocument();
});

test('a social dinner shows no grams and no reshuffle', () => {
  const { container } = renderCard({ kind: 'social', social: 'friends' });
  expect(screen.getByText('Cena con amigos — sin plan de comida')).toBeInTheDocument();
  expect(container).not.toHaveTextContent(/\d g\b/);
  expect(screen.queryByRole('button', { name: 'Otra opción' })).toBeNull();
});

test('empty and skipped slots say so without grams', () => {
  const { unmount } = renderCard({ kind: 'empty' });
  expect(screen.getByText(EMPTY_SLOT_TEXT)).toBeInTheDocument();
  unmount();
  renderCard({ kind: 'skip' });
  expect(screen.getByText('Sin plan para esta comida.')).toBeInTheDocument();
});

test('a free meal says so without grams', () => {
  const { container } = renderCard({ kind: 'free' });
  expect(screen.getByText(FREE_SLOT_TEXT)).toBeInTheDocument();
  expect(container).not.toHaveTextContent(/\d g\b/);
});

test('a soup slot shows its title, servings, scaled lines and recipe link', () => {
  renderCard({ kind: 'soup', soupId: 'miso', servings: 2 });
  expect(screen.getByText('Sopa Miso y shiitake (2 porciones)')).toBeInTheDocument();
  expect(screen.getByText('Shiitake — 80 g (crudo o congelado)')).toBeInTheDocument();
  expect(screen.getByText('Agua — 567 g (listo)')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver receta de Miso y shiitake' })).toHaveAttribute('href', '/cocinar/miso?p=2');
});

test('Otra opción swaps a template slot for another template', async () => {
  await putDay(DATE, 'rest', { snack: { kind: 'template', templateId: 'yogurt_fruit' } });
  renderCard({ kind: 'template', templateId: 'yogurt_fruit' }, { mealType: 'snack', dayType: 'rest' });
  expect(screen.getByText('Yogur proteico y fruta')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Otra opción' }));
  await waitFor(async () => {
    const snack = (await db.days.get(DATE))?.slots.snack;
    expect(snack?.kind).toBe('template');
    expect(snack).not.toEqual({ kind: 'template', templateId: 'yogurt_fruit' });
  });
});
