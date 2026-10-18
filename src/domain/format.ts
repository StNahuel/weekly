const gramsFormat = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 });

export function formatGrams(grams: number): string {
  return `${gramsFormat.format(grams)} g`;
}

export function formatTime(hhmm: string): string {
  return hhmm;
}

export function formatDuration([min, max]: readonly [number, number]): string {
  const [unit, divisor] = max < 60 ? ['s', 1] : ['min', 60];
  const low = Math.round(min / divisor);
  const high = Math.round(max / divisor);
  return low === high ? `${low} ${unit}` : `${low}–${high} ${unit}`;
}

const dateKeyFormat = new Intl.DateTimeFormat('es-UY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

// Noon UTC keeps the calendar day stable whatever the device zone.
export function formatDateKey(dateKey: string): string {
  return dateKeyFormat.format(new Date(`${dateKey}T12:00:00Z`));
}

const dateTimeFormat = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Montevideo',
});

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}
