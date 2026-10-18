import { Info } from 'lucide-react';
import { CALLOUT } from '../../app/ui';
import { soups } from '../../seed/soups';
import { MACHINE_NOTICE } from './copy';

export function MachineNotice() {
  if (!soups.safety.machineModelNotVerified) return null;
  return (
    <p className={`flex gap-2 text-sm ${CALLOUT}`}>
      <Info aria-hidden="true" size={20} className="shrink-0" />
      {MACHINE_NOTICE}
    </p>
  );
}
