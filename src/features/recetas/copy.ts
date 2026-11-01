import { formatGrams } from '../../domain/format';
import type { MachineSettings } from '../../domain/recipes/types';

export const MACHINE_NOTICE = 'Ajustes de iChef indicativos de recetas caseras; confirmá con el manual de tu equipo.';

export const HOT_BLEND_TEXT =
  'Nunca tritures a velocidad alta con la jarra llena e hirviendo. Dejá enfriar como indica el fabricante, respetá la marca MAX, asegurá la tapa como indica el manual y subí la velocidad de a poco.';

export const VAPOR_TEXT =
  'Seguí el manual de tu equipo para el vaso medidor, la salida de vapor y la canasta antisalpicaduras; no todas las versiones aceptan la misma configuración.';

export const BONE_BROTH_STEP_TEXT = 'Con caldo de huesos: va listo y congelado directo a la jarra, sin concentrado vegetal.';

export const NO_NEW_INGREDIENTS = 'Sin ingredientes nuevos en este paso';

const HOT_STEP_MIN_C = 95;

export function needsSafetyBanner(machine: MachineSettings): boolean {
  const maxTemperature = machine.temperatureCRange?.[1];
  return machine.speed.mode === 'gradual' || (maxTemperature !== undefined && maxTemperature >= HOT_STEP_MIN_C);
}

export function capacityText(totalGrams: number, warning: boolean): string {
  const total = formatGrams(totalGrams);
  return warning
    ? `Atención: aprox. ${total} de ingredientes en la jarra; revisá la marca MAX y, si queda muy llena, hacé dos tandas.`
    : `Aprox. ${total} de ingredientes en la jarra. Respetá siempre la marca MAX.`;
}
