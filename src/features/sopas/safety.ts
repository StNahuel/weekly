import type { Controls } from '../../domain/schemas/soups.schema';

const HOT_STEP_MIN_C = 95;

export function needsSafetyBanner(controls: Controls): boolean {
  const maxTemperature = controls.temperatureCRange?.[1];
  return controls.speed.mode === 'gradual' || (maxTemperature !== undefined && maxTemperature >= HOT_STEP_MIN_C);
}
