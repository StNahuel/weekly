import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLiveQuery } from 'dexie-react-hooks';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { defaults } from '../../seed/defaults';
import { freshProfile } from './ajustesTestUtils';
import { hasSpanishText } from './copy';
import { TargetsForm } from './TargetsForm';
import { getProfile } from '../../test/db';

function LiveTargets() {
  const profile = useLiveQuery(() => db.profile.get('me'));
  return profile ? <TargetsForm profile={profile} /> : null;
}

beforeEach(async () => {
  await freshProfile();
});

test('shows the provisional seed ranges and text-only supplements', async () => {
  render(<LiveTargets />);
  expect(await screen.findByText('2200–2300 kcal')).toBeInTheDocument();
  expect(screen.getByText('150–170 g')).toBeInTheDocument();
  expect(screen.getByText('Provisional — sin peso confirmado, no es una indicación médica.')).toBeInTheDocument();
  expect(screen.getByLabelText('Proteína mínima (g)')).toHaveValue(150);

  const supplements = screen.getByRole('region', { name: 'Suplementos' });
  expect(within(supplements).getByText('Creatina: 3–5 g por día.')).toBeInTheDocument();
  expect(within(supplements).queryAllByRole('checkbox')).toEqual([]);
  expect(within(supplements).queryAllByRole('switch')).toEqual([]);
  expect(within(supplements).queryAllByRole('button')).toEqual([]);
  const { whey, magnesium, omega3 } = defaults.nutrition.supplements;
  expect([whey.use, magnesium.note, omega3.note].every(hasSpanishText)).toBe(true);
  expect(supplements).toHaveTextContent('Magnesio: la app no lo sugiere');
});

test('a valid range saves on leaving the field; min above max is not saved', async () => {
  render(<LiveTargets />);
  const max = await screen.findByLabelText('Proteína máxima (g)');
  await userEvent.clear(max);
  await userEvent.type(max, '180');
  await userEvent.tab();
  await waitFor(async () => expect((await getProfile())?.nutrition.proteinDailyGramsRange).toEqual([150, 180]));
  expect(await screen.findByText('150–180 g')).toBeInTheDocument();

  const kcalMin = screen.getByLabelText('Calorías mínimas (kcal)');
  await userEvent.clear(kcalMin);
  await userEvent.type(kcalMin, '2100');
  await userEvent.tab();
  await waitFor(async () => expect((await getProfile())?.nutrition.calorieRangeKcal).toEqual([2100, 2300]));
  expect((await getProfile())?.nutrition.proteinDailyGramsRange).toEqual([150, 180]);

  await userEvent.clear(kcalMin);
  await userEvent.type(kcalMin, '2400');
  await userEvent.tab();
  expect(screen.getByRole('alert')).toHaveTextContent('el mínimo no puede superar al máximo');
  expect((await getProfile())?.nutrition.calorieRangeKcal).toEqual([2100, 2300]);
});
