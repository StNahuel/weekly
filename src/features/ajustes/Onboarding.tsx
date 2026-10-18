import { Check } from 'lucide-react';
import { useState } from 'react';
import { saveProfile } from '../../db/repo';
import type { ProfileRecord } from '../../db/types';
import { CARD, ONBOARDING_INTRO, PRIMARY } from './copy';
import { DietaryForm } from './DietaryForm';
import { ScheduleForm } from './ScheduleForm';

export function Onboarding({ profile }: { profile: ProfileRecord }) {
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await saveProfile({ onboardingCompletedAt: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby="onboarding-heading" className={CARD}>
        <h2 id="onboarding-heading" className="text-lg font-semibold">
          Antes de empezar
        </h2>
        <p className="mt-1">{ONBOARDING_INTRO}</p>
        <p className="mt-1 text-sm text-muted">Todo se puede cambiar después en Ajustes.</p>
      </section>
      <ScheduleForm profile={profile} />
      <DietaryForm profile={profile} />
      <button type="button" disabled={saving} onClick={() => void finish()} className={PRIMARY}>
        <Check aria-hidden="true" size={20} />
        Listo
      </button>
    </div>
  );
}
