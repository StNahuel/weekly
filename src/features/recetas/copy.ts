import { formatGrams } from '../../domain/format';
import type { MachineSettings } from '../../domain/recipes/types';

export const MACHINE_NOTICE = 'Ajustes de iChef indicativos, basados en recetas del portal iChef; confirmá con el manual de tu equipo.';

export const HOT_BLEND_TEXT =
  'Nunca tritures a velocidad alta con la jarra llena e hirviendo. Dejá enfriar como indica el fabricante, respetá la marca MAX, asegurá la tapa como indica el manual y subí la velocidad de a poco.';

export const VAPOR_TEXT =
  'En cocciones largas usá la tapa sin la taza medidora y la canasta o la bandeja de la vaporera arriba contra salpicaduras. Con la vaporera, el vaso necesita al menos 700 g de agua; abrí la tapa alejándola de vos.';

export const BONE_BROTH_STEP_TEXT = 'Con caldo de huesos: va listo y congelado directo a la jarra, sin concentrado vegetal.';

// The user avoids turmeric (ceramic braces); curry pastes often contain it.
export const CURRY_PASTE_ID = 'curry_paste';
export const CURRY_TURMERIC_NOTE = 'La pasta de curry suele llevar cúrcuma: revisá la etiqueta antes de comprarla.';

export const NO_NEW_INGREDIENTS = 'Sin ingredientes nuevos en este paso';

const HOT_STEP_MIN_C = 95;

export function needsSafetyBanner(machine: MachineSettings): boolean {
  const maxTemperature = machine.temperatureCRange?.[1];
  return (
    machine.steam === true ||
    machine.speed.mode === 'gradual' ||
    (maxTemperature !== undefined && maxTemperature >= HOT_STEP_MIN_C)
  );
}

export function capacityText(totalGrams: number, warning: boolean): string {
  const total = formatGrams(totalGrams);
  return warning
    ? `Atención: aprox. ${total} de ingredientes en la jarra; revisá la marca MAX y, si queda muy llena, hacé dos tandas.`
    : `Aprox. ${total} de ingredientes en la jarra. Respetá siempre la marca MAX.`;
}
