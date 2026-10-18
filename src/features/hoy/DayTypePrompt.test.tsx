import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { soupIngredientLookup } from '../../domain/meals/resolveMeal';
import { seedContext } from '../../domain/meals/testHelpers';
import { suggestDayType } from '../../domain/day/today';
import { MEAL_TYPES } from '../../domain/types';
import { defaults } from '../../seed/defaults';
import { clearDb } from '../../test/db';
import { DayTypePrompt } from './DayTypePrompt';

const TUESDAY = '2026-10-20';
const NO_DIET = { excludedIngredientIds: [], excludedTags: [] };
const SOUP_IDS = soupIngredientLookup(seedContext());
const OATS_WHEY = { kind: 'template', templateId: 'oats_whey' };

beforeEach(clearDb);

test('Tuesday preselects Boxeo and Confirmar stores the day with four slots', async () => {
  render(<DayTypePrompt dateKey={TUESDAY} suggestion={suggestDayType(defaults.schedule.template, 'tuesday')} dietary={NO_DIET} soupIngredientIds={SOUP_IDS} />);
  expect(screen.getByRole('heading', { name: '¿Qué tipo de día vas a tener?' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Boxeo' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Musculación' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.queryByText(/Sábado flexible/)).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(async () => expect(await db.days.get(TUESDAY)).toBeDefined());
  const day = await db.days.get(TUESDAY);
  expect(day?.dayType).toBe('boxing');
  expect(day?.flexible).toBe(false);
  expect(Object.keys(day?.slots ?? {}).sort()).toEqual([...MEAL_TYPES].sort());
});

test('Saturday notes the flexible day and a changed choice is stored as chosen', async () => {
  render(<DayTypePrompt dateKey="2026-10-17" suggestion={suggestDayType(defaults.schedule.template, 'saturday')} dietary={NO_DIET} soupIngredientIds={SOUP_IDS} />);
  expect(screen.getByText('Sábado flexible: elegí lo que venga')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Descanso' })).toHaveAttribute('aria-pressed', 'true');

  await userEvent.click(screen.getByRole('button', { name: 'Sin tiempo / trabajo' }));
  expect(screen.getByRole('button', { name: 'Sin tiempo / trabajo' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(async () => expect((await db.days.get('2026-10-17'))?.dayType).toBe('busy'));
  expect((await db.days.get('2026-10-17'))?.flexible).toBe(false);
});

test('suggested slots respect the dietary exclusions passed in', async () => {
  const sunday = suggestDayType(defaults.schedule.template, 'sunday');
  render(<DayTypePrompt dateKey="2026-10-18" suggestion={sunday} dietary={NO_DIET} soupIngredientIds={SOUP_IDS} />);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(async () => expect((await db.days.get('2026-10-18'))?.slots.breakfast).toEqual(OATS_WHEY));
  cleanup();
  await db.days.clear();

  const noWhey = { excludedIngredientIds: ['whey_powder'], excludedTags: [] };
  render(<DayTypePrompt dateKey="2026-10-18" suggestion={sunday} dietary={noWhey} soupIngredientIds={SOUP_IDS} />);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(async () => expect(await db.days.get('2026-10-18')).toBeDefined());
  expect((await db.days.get('2026-10-18'))?.slots.breakfast).not.toEqual(OATS_WHEY);
});
