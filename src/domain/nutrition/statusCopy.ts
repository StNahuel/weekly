import { formatGrams } from '../format';
import type { DayTotal, UnknownItem } from './projectDay';
import type { Proposal, UnresolvedReason } from './proposeAdjustment';

const numberFormat = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 });
const MINUS = '−';

const formatNumber = (x: number) => numberFormat.format(Math.round(Math.abs(x)));

function signed(x: number): string {
  const rounded = Math.sign(x) * Math.round(Math.abs(x));
  if (rounded === 0) return '±0';
  return `${rounded > 0 ? '+' : MINUS}${formatNumber(rounded)}`;
}

export function dayStatusLine(total: Pick<DayTotal, 'kcal' | 'protein'>, targetKcal: number): string {
  return `≈ ${formatNumber(total.kcal)} kcal de ${formatNumber(targetKcal)} (${signed(total.kcal - targetKcal)}) · ${formatNumber(total.protein)} g proteína`;
}

function unknownPart(item: UnknownItem): string {
  switch (item.kind) {
    case 'social':
      return `${item.name} social`;
    case 'empty':
      return `${item.name} sin elegir`;
    case 'ingredient':
      return item.grams === undefined ? item.name : `${item.name} (${formatGrams(item.grams)})`;
  }
}

export function incompleteLine(unknown: readonly UnknownItem[]): string | null {
  if (unknown.length === 0) return null;
  return `Estimación incompleta: sin datos de ${unknown.map(unknownPart).join(', ')}`;
}

export function proteinFloorLine(proteinGrams: number, floorGrams: number): string | null {
  return proteinGrams < floorGrams ? `Proteína por debajo de ${formatNumber(floorGrams)} g` : null;
}

export function proposalLines(proposal: Proposal, toleranceKcal: number): string[] {
  const change = `${proposal.name}: ${formatGrams(proposal.fromGrams)} → ${formatGrams(proposal.toGrams)} (${signed(proposal.kcalDelta)} kcal)`;
  const residual = proposal.residualKcal;
  if (Math.abs(residual) <= toleranceKcal) return [change];
  const rest =
    residual > 0
      ? `Aun así quedarías unas ${formatNumber(residual)} kcal por debajo del objetivo; podés sumar una merienda con energía.`
      : `Aun así quedarías unas ${formatNumber(residual)} kcal por encima del objetivo; está bien dejarlo así.`;
  return [change, rest];
}

const UNRESOLVED_LINES: Readonly<Record<UnresolvedReason, string>> = {
  unknowable: 'Con datos incompletos no se propone un ajuste: se muestra el subtotal conocido.',
  bounds: 'No hay un ajuste razonable dentro de porciones realistas; el día queda como está.',
  nothing_ahead: 'No quedan comidas pendientes para ajustar hoy.',
};

export function unresolvedLine(reason: UnresolvedReason): string {
  return UNRESOLVED_LINES[reason];
}
