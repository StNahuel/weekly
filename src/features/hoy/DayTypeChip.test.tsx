import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLiveQuery } from 'dexie-react-hooks';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { clearDb } from '../../test/db';
import { DayTypeChip } from './DayTypeChip';
import { DAY_TYPE_EFFECTS } from './labels';
import { putDay } from './testDay';

const MONDAY = '2026-10-19';

function Harness() {
  const day = useLiveQuery(() => db.days.get(MONDAY));
  return day ? <DayTypeChip day={day} /> : null;
}

beforeEach(clearDb);

test('strength → busy keeps the chosen meals and shows the plain busy note', async () => {
  const before = await putDay(MONDAY, 'strength', {
    lunch: { kind: 'combo', proteinId: 'salmon', sideId: 'rice_broccoli' },
    dinner: { kind: 'combo', proteinId: 'chicken', sideId: 'soup_miso' },
  });
  const { container } = render(<Harness />);
  expect(await screen.findByText('Musculación')).toBeInTheDocument();
  expect(screen.getByText(DAY_TYPE_EFFECTS.strength)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Cambiar tipo de día' }));
  expect(screen.getByRole('button', { name: 'Musculación' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Sin tiempo / trabajo' }));

  expect(
    await screen.findByText('Priorizá comidas rápidas y prácticas. Saltear el entrenamiento no se castiga.'),
  ).toBeInTheDocument();
  const after = await db.days.get(MONDAY);
  expect(after?.dayType).toBe('busy');
  expect(after?.slots).toEqual(before.slots);
  expect(container).not.toHaveTextContent(/kcal/);
});

test('picking the current type again changes nothing', async () => {
  await putDay(MONDAY, 'rest');
  render(<Harness />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cambiar tipo de día' }));
  await userEvent.click(screen.getByRole('button', { name: 'Descanso' }));
  expect(screen.queryByRole('group', { name: 'Elegí el tipo de día' })).toBeNull();
  expect((await db.days.get(MONDAY))?.dayType).toBe('rest');
});
