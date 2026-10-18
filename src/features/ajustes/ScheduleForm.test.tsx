import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import type { ProfileRecord } from '../../db/types';
import { freshProfile } from './ajustesTestUtils';
import { ScheduleForm } from './ScheduleForm';
import { getProfile } from '../../test/db';

let profile: ProfileRecord;

beforeEach(async () => {
  profile = await freshProfile();
});

test('seed hours show the boxing conflict; leaving work at 17:30 clears it and saves', async () => {
  render(<ScheduleForm profile={profile} />);
  expect(screen.getByLabelText('Salida del trabajo')).toHaveValue('18:30');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'La clase de boxeo (18:00) cae dentro del horario laboral (09:30–18:30).',
  );

  fireEvent.change(screen.getByLabelText('Salida del trabajo'), { target: { value: '17:30' } });
  expect(screen.queryByRole('alert')).toBeNull();
  await waitFor(async () => expect((await getProfile())?.schedule.workEnd).toBe('17:30'));
});

test('a cleared time keeps its stored value while the weekly template still saves', async () => {
  render(<ScheduleForm profile={profile} />);
  fireEvent.change(screen.getByLabelText('Cena'), { target: { value: '' } });
  await userEvent.selectOptions(screen.getByLabelText('Sábado'), 'Descanso');
  await waitFor(async () => expect((await getProfile())?.schedule.template.saturday).toBe('rest'));
  expect(screen.getByLabelText('Sábado')).toHaveValue('rest');
  expect((await getProfile())?.schedule.meals.dinner).toBe('20:30');

  fireEvent.change(screen.getByLabelText('Cena'), { target: { value: '21:00' } });
  await waitFor(async () => expect((await getProfile())?.schedule.meals.dinner).toBe('21:00'));
});

test('every weekday offers the five day types plus Flexible', () => {
  render(<ScheduleForm profile={profile} />);
  const options = [...screen.getByLabelText<HTMLSelectElement>('Sábado').options].map((o) => o.text);
  expect(options).toEqual(['Musculación', 'Boxeo', 'Descanso', 'Sin tiempo / trabajo', 'Enfermo / recuperación', 'Flexible']);
  expect(screen.getByLabelText('Sábado')).toHaveValue('flexible');
});

test('social dinner counts save within 0–7 and an out-of-range value keeps the stored one', async () => {
  render(<ScheduleForm profile={profile} />);
  expect(screen.getByLabelText('Cenas con amigos por semana')).toHaveValue(1);
  expect(screen.getByLabelText('Cenas en familia por semana')).toHaveValue(1);

  fireEvent.change(screen.getByLabelText('Cenas con amigos por semana'), { target: { value: '2' } });
  await waitFor(async () => expect((await getProfile())?.schedule.socialDinnersPerWeek.friends).toBe(2));

  fireEvent.change(screen.getByLabelText('Cenas en familia por semana'), { target: { value: '9' } });
  fireEvent.change(screen.getByLabelText('Salida del trabajo'), { target: { value: '17:30' } });
  await waitFor(async () => expect((await getProfile())?.schedule.workEnd).toBe('17:30'));
  expect((await getProfile())?.schedule.socialDinnersPerWeek).toMatchObject({ friends: 2, family: 1 });
});
