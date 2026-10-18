import { TriangleAlert } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { saveProfile } from '../../db/repo';
import type { ProfileRecord } from '../../db/types';
import { findScheduleConflicts } from '../../domain/day/scheduleConflict';
import { hhmmSchema, type Schedule } from '../../domain/schemas/defaults.schema';
import { MEAL_TYPES, TEMPLATE_DAYS, WEEKDAYS, type TemplateDay } from '../../domain/types';
import { DAY_TYPE_LABELS, MEAL_LABELS } from '../hoy/labels';
import { ALERT, CARD, FIELD, WEEKDAY_LABELS } from './copy';

const TEMPLATE_LABELS: Readonly<Record<TemplateDay, string>> = { ...DAY_TYPE_LABELS, flexible: 'Flexible' };

type DayTimeKey = 'wakeTime' | 'sleepTimeTarget' | 'workStart' | 'workEnd';

const DAY_TIMES: readonly { key: DayTimeKey; label: string }[] = [
  { key: 'wakeTime', label: 'Despertarse' },
  { key: 'sleepTimeTarget', label: 'Dormir' },
  { key: 'workStart', label: 'Entrada al trabajo' },
  { key: 'workEnd', label: 'Salida del trabajo' },
];

const pick = (time: string, fallback: string) => (hhmmSchema.safeParse(time).success ? time : fallback);
const pickCount = (count: number, fallback: number) => (Number.isInteger(count) && count >= 0 && count <= 7 ? count : fallback);

type SocialKey = 'friends' | 'family';

const SOCIAL_COUNTS: readonly { key: SocialKey; label: string }[] = [
  { key: 'friends', label: 'Cenas con amigos por semana' },
  { key: 'family', label: 'Cenas en familia por semana' },
];

// A half-typed or cleared time keeps its stored value while the other fields still save.
function withValidTimes(next: Schedule, stored: Schedule): Schedule {
  return {
    ...next,
    wakeTime: pick(next.wakeTime, stored.wakeTime),
    sleepTimeTarget: pick(next.sleepTimeTarget, stored.sleepTimeTarget),
    workStart: pick(next.workStart, stored.workStart),
    workEnd: pick(next.workEnd, stored.workEnd),
    meals: {
      breakfast: pick(next.meals.breakfast, stored.meals.breakfast),
      lunch: pick(next.meals.lunch, stored.meals.lunch),
      snack: pick(next.meals.snack, stored.meals.snack),
      dinner: pick(next.meals.dinner, stored.meals.dinner),
    },
    preferredExerciseTimes: {
      strength: pick(next.preferredExerciseTimes.strength, stored.preferredExerciseTimes.strength),
      boxing: pick(next.preferredExerciseTimes.boxing, stored.preferredExerciseTimes.boxing),
    },
    socialDinnersPerWeek: {
      ...next.socialDinnersPerWeek,
      friends: pickCount(next.socialDinnersPerWeek.friends, stored.socialDinnersPerWeek.friends),
      family: pickCount(next.socialDinnersPerWeek.family, stored.socialDinnersPerWeek.family),
    },
  };
}

function Row({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Row label={label}>
      {(id) => <input id={id} type="time" value={value} onChange={(event) => onChange(event.target.value)} className={FIELD} />}
    </Row>
  );
}

const legend = 'text-sm font-semibold tracking-wide text-muted uppercase';

export function ScheduleForm({ profile }: { profile: ProfileRecord }) {
  const headingId = useId();
  const [schedule, setSchedule] = useState(profile.schedule);
  const conflicts = findScheduleConflicts(schedule);

  const update = (next: Schedule) => {
    setSchedule(next);
    void saveProfile({ schedule: withValidTimes(next, profile.schedule) });
  };

  return (
    <section aria-labelledby={headingId} className={`space-y-4 ${CARD}`}>
      <header>
        <h2 id={headingId} className="text-lg font-semibold">
          Horarios
        </h2>
        <p className="text-sm text-muted">Son sugerencias: ajustalos a tus horarios reales.</p>
      </header>
      {conflicts.length > 0 && (
        <div role="alert" className={`space-y-1 ${ALERT}`}>
          {conflicts.map((conflict) => (
            <p key={conflict.kind} className="flex gap-2">
              <TriangleAlert aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-gold" />
              {conflict.message}
            </p>
          ))}
        </div>
      )}
      <fieldset className="space-y-1">
        <legend className={legend}>Tu día</legend>
        {DAY_TIMES.map(({ key, label }) => (
          <TimeRow key={key} label={label} value={schedule[key]} onChange={(value) => update({ ...schedule, [key]: value })} />
        ))}
      </fieldset>
      <fieldset className="space-y-1">
        <legend className={legend}>Comidas</legend>
        {MEAL_TYPES.map((meal) => (
          <TimeRow
            key={meal}
            label={MEAL_LABELS[meal]}
            value={schedule.meals[meal]}
            onChange={(value) => update({ ...schedule, meals: { ...schedule.meals, [meal]: value } })}
          />
        ))}
      </fieldset>
      <fieldset className="space-y-1">
        <legend className={legend}>Entrenamiento (hora preferida)</legend>
        <TimeRow
          label="Musculación"
          value={schedule.preferredExerciseTimes.strength}
          onChange={(value) =>
            update({ ...schedule, preferredExerciseTimes: { ...schedule.preferredExerciseTimes, strength: value } })
          }
        />
        <TimeRow
          label="Clase de boxeo"
          value={schedule.preferredExerciseTimes.boxing}
          onChange={(value) =>
            update({ ...schedule, preferredExerciseTimes: { ...schedule.preferredExerciseTimes, boxing: value } })
          }
        />
      </fieldset>
      <fieldset className="space-y-1">
        <legend className={legend}>Semana tipo</legend>
        {WEEKDAYS.map((weekday) => (
          <Row key={weekday} label={WEEKDAY_LABELS[weekday]}>
            {(id) => (
              <select
                id={id}
                value={schedule.template[weekday]}
                onChange={(event) => {
                  const value = TEMPLATE_DAYS.find((day) => day === event.target.value);
                  if (value) update({ ...schedule, template: { ...schedule.template, [weekday]: value } });
                }}
                className={FIELD}
              >
                {TEMPLATE_DAYS.map((day) => (
                  <option key={day} value={day}>
                    {TEMPLATE_LABELS[day]}
                  </option>
                ))}
              </select>
            )}
          </Row>
        ))}
      </fieldset>
      <fieldset className="space-y-1">
        <legend className={legend}>Cenas sociales</legend>
        <p className="text-sm text-muted">Solo como referencia; la app no compensa ni cambia otras comidas.</p>
        {SOCIAL_COUNTS.map(({ key, label }) => (
          <Row key={key} label={label}>
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                max={7}
                step={1}
                value={Number.isNaN(schedule.socialDinnersPerWeek[key]) ? '' : schedule.socialDinnersPerWeek[key]}
                onChange={(event) =>
                  update({
                    ...schedule,
                    socialDinnersPerWeek: { ...schedule.socialDinnersPerWeek, [key]: event.target.valueAsNumber },
                  })
                }
                className={`${FIELD} w-20`}
              />
            )}
          </Row>
        ))}
      </fieldset>
    </section>
  );
}
