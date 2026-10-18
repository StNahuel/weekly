import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import type { ProfileRecord } from '../../db/types';
import { seeds } from '../../seed';
import { clearDb, getPlan, getProfile } from '../../test/db';
import { putPlan } from './comprarTestUtils';
import { PlanHeader } from './PlanHeader';

let profile: ProfileRecord;

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
  const stored = await getProfile();
  if (!stored) throw new Error('profile missing');
  profile = stored;
});

test('without a plan, five days are preselected and Armar plan creates it from today', async () => {
  render(<PlanHeader plan={null} profile={profile} today="2026-10-16" />);
  expect(screen.getByText('Todavía no hay plan. Es opcional: armá uno de 3 a 7 días cuando quieras.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '5 días' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '3 días' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-16');

  await userEvent.click(screen.getByRole('button', { name: 'Armar plan' }));
  await waitFor(async () => expect((await getPlan())?.meals).toHaveLength(20));
  expect((await getPlan())?.startDate).toBe('2026-10-16');
});

test('a chosen horizon sets the number of planned days', async () => {
  render(<PlanHeader plan={null} profile={profile} today="2026-10-16" />);
  await userEvent.click(screen.getByRole('button', { name: '3 días' }));
  await userEvent.click(screen.getByRole('button', { name: 'Armar plan' }));
  await waitFor(async () => expect((await getPlan())?.horizonDays).toBe(3));
  expect((await getPlan())?.meals).toHaveLength(12);
});

test('with a plan, Rearmar plan keeps its horizon and resets the list edits', async () => {
  const plan = await putPlan([], { horizonDays: 4, checkedKeys: ['salmon|raw'] });
  render(<PlanHeader plan={plan} profile={profile} today="2026-10-18" />);
  expect(screen.queryByText(/Todavía no hay plan/)).toBeNull();
  expect(screen.getByRole('button', { name: '4 días' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-16');
  expect(screen.getByText(/Rearmar mantiene/)).toHaveTextContent(
    'En los días ya confirmados en Hoy mandan las comidas de Hoy, aunque las hayas marcado distinto en el plan.',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Rearmar plan' }));
  await waitFor(async () => expect((await getPlan())?.meals).toHaveLength(16));
  expect((await getPlan())?.checkedKeys).toEqual([]);
});
