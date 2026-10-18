import { describe, expect, test } from 'vitest';
import { defaults } from '../../seed/defaults';
import { findScheduleConflicts } from './scheduleConflict';

const schedule = defaults.schedule;

describe('findScheduleConflicts', () => {
  test('seed boxing at 18:00 falls inside 09:30–18:30 work', () => {
    expect(findScheduleConflicts(schedule)).toEqual([
      {
        kind: 'boxing_during_work',
        message:
          'La clase de boxeo (18:00) cae dentro del horario laboral (09:30–18:30). Ajustá el horario real de clase o trabajo.',
      },
    ]);
  });

  test('work ending before class clears the warning', () => {
    expect(findScheduleConflicts({ ...schedule, workEnd: '17:30' })).toEqual([]);
  });

  test('work end is exclusive', () => {
    expect(findScheduleConflicts({ ...schedule, workEnd: '18:00' })).toEqual([]);
  });

  test('strength inside work hours is flagged too', () => {
    const conflicts = findScheduleConflicts({
      ...schedule,
      workEnd: '17:30',
      preferredExerciseTimes: { strength: '12:00', boxing: '19:00' },
    });
    expect(conflicts).toEqual([
      {
        kind: 'strength_during_work',
        message:
          'La sesión de musculación (12:00) cae dentro del horario laboral (09:30–17:30). Ajustá el horario real de entrenamiento o trabajo.',
      },
    ]);
  });
});
