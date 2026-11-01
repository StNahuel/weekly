import type { Device } from '../../domain/recipes/types';
import { DEVICE_ICONS, DEVICE_LABELS, DEVICE_TINTS } from './labels';

export function DeviceChip({ device, large = false }: { device: Device; large?: boolean }) {
  const Icon = DEVICE_ICONS[device];
  const tint = DEVICE_TINTS[device];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${tint.fill} ${tint.ink} ${
        large ? 'min-h-11 px-4 text-lg' : 'px-2.5 py-0.5 text-sm'
      }`}
    >
      <Icon aria-hidden="true" size={large ? 20 : 16} />
      {DEVICE_LABELS[device]}
    </span>
  );
}

export function DeviceChips({ devices }: { devices: readonly Device[] }) {
  return (
    <ul aria-label="Equipos" className="flex flex-wrap gap-1.5">
      {devices.map((device) => (
        <li key={device}>
          <DeviceChip device={device} />
        </li>
      ))}
    </ul>
  );
}
