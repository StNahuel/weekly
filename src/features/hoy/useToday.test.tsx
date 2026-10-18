import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import { seeds } from '../../seed';
import { clearDb } from '../../test/db';
import { DATE_CHECK_INTERVAL_MS, useToday } from './useToday';

function Probe() {
  const { dateKey, day, suggestion } = useToday();
  const dayText = day === undefined ? 'cargando' : (day?.dayType ?? 'sin día');
  return <p>{`${dateKey} | ${dayText} | ${suggestion ? `${suggestion.dayType} ${suggestion.flexible}` : '-'}`}</p>;
}

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-17T02:30:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

test('the date key follows Montevideo and rolls over on the interval', async () => {
  render(<Probe />);
  expect(await screen.findByText('2026-10-16 | sin día | strength false')).toBeInTheDocument();

  act(() => {
    vi.setSystemTime(new Date('2026-10-17T03:30:00Z'));
    vi.advanceTimersByTime(DATE_CHECK_INTERVAL_MS);
  });
  expect(await screen.findByText('2026-10-17 | sin día | rest true')).toBeInTheDocument();
});

test('returning to the app re-reads the date and loads that day', async () => {
  await db.days.put({
    date: '2026-10-17',
    dayType: 'rest',
    flexible: true,
    slots: { breakfast: { kind: 'empty' }, lunch: { kind: 'empty' }, snack: { kind: 'empty' }, dinner: { kind: 'empty' } },
    confirmedAt: '2026-10-17T12:00:00Z',
  });
  render(<Probe />);
  expect(await screen.findByText('2026-10-16 | sin día | strength false')).toBeInTheDocument();

  act(() => {
    vi.setSystemTime(new Date('2026-10-17T03:30:00Z'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await screen.findByText('2026-10-17 | rest | rest true')).toBeInTheDocument();
});
