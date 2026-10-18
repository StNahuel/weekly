import type { WeightBasis } from '../../domain/types';

export const BASIS_LABELS: Readonly<Record<WeightBasis, string>> = {
  raw: 'crudo',
  drained_ready: 'escurrido',
  edible_raw: 'crudo, parte comestible',
  ready: 'listo',
  powder: 'en polvo',
  dry: 'seco',
  edible: 'parte comestible',
  raw_or_frozen: 'crudo o congelado',
  cooked: 'cocido',
  frozen_concentrate: 'concentrado congelado',
  frozen_ready: 'congelado listo',
};
