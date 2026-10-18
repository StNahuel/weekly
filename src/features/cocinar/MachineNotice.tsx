import { Info } from 'lucide-react';
import { soups } from '../../seed/soups';
import { MACHINE_NOTICE } from './copy';

export function MachineNotice() {
  if (!soups.safety.machineModelNotVerified) return null;
  return (
    <p className="flex gap-2 rounded-xl border border-gold/60 p-3 text-sm">
      <Info aria-hidden="true" size={20} className="shrink-0 text-gold" />
      {MACHINE_NOTICE}
    </p>
  );
}
