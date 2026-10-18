import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLiveQuery } from 'dexie-react-hooks';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { soupIngredientLookup } from '../../domain/meals/resolveMeal';
import { seedContext } from '../../domain/meals/testHelpers';
import { clearDb } from '../../test/db';
import { SocialDinnerMenu } from './SocialDinnerMenu';
import { lastDinnerKey } from './socialDinner';
import { putDay } from './testDay';

const DATE = '2026-10-20';
const NO_DIET = { excludedIngredientIds: [], excludedTags: [], notes: '' };
const SOUP_IDS = soupIngredientLookup(seedContext());

function Harness() {
  const day = useLiveQuery(() => db.days.get(DATE));
  return day ? <SocialDinnerMenu date={DATE} slot={day.slots.dinner} dayType={day.dayType} dietary={NO_DIET} soupIngredientIds={SOUP_IDS} /> : null;
}

const dinner = async () => (await db.days.get(DATE))?.slots.dinner;

beforeEach(clearDb);

test('Amigos marks dinner social without touching the day type, and Plan normal restores the meal', async () => {
  await putDay(DATE, 'boxing', { dinner: { kind: 'combo', proteinId: 'salmon', sideId: 'soup_verde' } });
  render(<Harness />);
  expect(await screen.findByRole('button', { name: 'Plan normal' })).toHaveAttribute('aria-pressed', 'true');

  await userEvent.click(screen.getByRole('button', { name: 'Amigos' }));
  await waitFor(async () => expect(await dinner()).toEqual({ kind: 'social', social: 'friends' }));
  expect((await db.days.get(DATE))?.dayType).toBe('boxing');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Amigos' })).toHaveAttribute('aria-pressed', 'true'));

  await userEvent.click(screen.getByRole('button', { name: 'Familia' }));
  await waitFor(async () => expect(await dinner()).toEqual({ kind: 'social', social: 'family' }));

  await userEvent.click(screen.getByRole('button', { name: 'Plan normal' }));
  await waitFor(async () => expect((await dinner())?.kind).toBe('combo'));
  expect(await dinner()).toMatchObject({ proteinId: 'salmon', sideId: 'soup_verde' });
  expect(await db.meta.get(lastDinnerKey(DATE))).toBeUndefined();
});

test('Plan normal without a saved meal reshuffles a new combo', async () => {
  await putDay(DATE, 'boxing', { dinner: { kind: 'social', social: 'friends' } });
  render(<Harness />);
  await userEvent.click(await screen.findByRole('button', { name: 'Plan normal' }));
  await waitFor(async () => expect((await dinner())?.kind).toBe('combo'));
});

test('no option uses compensation language', async () => {
  await putDay(DATE, 'boxing');
  const { container } = render(<Harness />);
  await screen.findByRole('button', { name: 'Plan normal' });
  expect(container).not.toHaveTextContent(/compens|penaliz|kcal|ayuno/i);
});
