import { formatGrams } from '../../domain/format';
import type { ResolvedSoup } from '../../domain/soups/types';
import type { ThaiLegume } from '../../domain/types';

export const MACHINE_NOTICE = 'Ajustes indicativos de recetas caseras; confirmá con el manual de tu iChef.';

export const ADDED_TO_LIST = 'Agregada a la lista de compras';

export function capacityText({ totalGrams, capacityWarning }: Pick<ResolvedSoup, 'totalGrams' | 'capacityWarning'>): string {
  const total = formatGrams(totalGrams);
  return capacityWarning
    ? `Atención: aprox. ${total} de ingredientes; revisá la marca máxima; si queda muy llena, hacé dos tandas.`
    : `Aprox. ${total} de ingredientes antes de cocinar. Respetá siempre la marca MAX de la jarra.`;
}

export const LEGUME_LABELS: Readonly<Record<ThaiLegume, string>> = {
  none: 'Sin legumbre',
  chickpeas: 'Garbanzos',
  edamame: 'Edamame',
};

// The seed keeps these source notes in English; the UI must stay in Spanish.
const SEED_TEXT_ES: Readonly<Record<string, string>> = {
  'Never blend a boiling, full jug at high speed. Cool as manufacturer instructs, respect MAX, lid secured as prescribed, ramp speed.':
    'Nunca tritures a velocidad alta con la jarra llena e hirviendo. Dejá enfriar como indica el fabricante, respetá la marca MAX, asegurá la tapa como indica el manual y subí la velocidad de a poco.',
  'Follow device instructions for measuring cap/steam vent/anti-splash basket; do not assert that every version safely accepts the same configuration.':
    'Seguí el manual de tu equipo para el vaso medidor, la salida de vapor y la canasta antisalpicaduras; no todas las versiones aceptan la misma configuración.',
  'Omitted turmeric (1 g) and used cumin (1 g) due to explicit user preference.':
    'Adaptación: se quitó la cúrcuma (1 g) y se usa comino (1 g) por preferencia tuya.',
};

export function hasSpanishText(text: string): boolean {
  return text in SEED_TEXT_ES;
}

export function seedTextEs(text: string): string {
  return SEED_TEXT_ES[text] ?? text;
}
