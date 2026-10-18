import type { Schedule } from '../schemas/defaults.schema';

export type ScheduleConflict = { kind: 'boxing_during_work' | 'strength_during_work'; message: string };

type ConflictInput = Pick<Schedule, 'workStart' | 'workEnd' | 'preferredExerciseTimes'>;

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function findScheduleConflicts(schedule: ConflictInput): ScheduleConflict[] {
  const { workStart, workEnd, preferredExerciseTimes } = schedule;
  const duringWork = (hhmm: string) =>
    toMinutes(hhmm) >= toMinutes(workStart) && toMinutes(hhmm) < toMinutes(workEnd);
  const work = `${workStart}–${workEnd}`;
  const conflicts: ScheduleConflict[] = [];
  if (duringWork(preferredExerciseTimes.strength)) {
    conflicts.push({
      kind: 'strength_during_work',
      message: `La sesión de musculación (${preferredExerciseTimes.strength}) cae dentro del horario laboral (${work}). Ajustá el horario real de entrenamiento o trabajo.`,
    });
  }
  if (duringWork(preferredExerciseTimes.boxing)) {
    conflicts.push({
      kind: 'boxing_during_work',
      message: `La clase de boxeo (${preferredExerciseTimes.boxing}) cae dentro del horario laboral (${work}). Ajustá el horario real de clase o trabajo.`,
    });
  }
  return conflicts;
}
