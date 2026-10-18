import { useLiveQuery } from 'dexie-react-hooks';
import { useId } from 'react';
import { Loading } from '../../app/states/Loading';
import { db } from '../../db';
import { CARD } from './copy';
import { DataTransfer } from './DataTransfer';
import { DietaryForm } from './DietaryForm';
import { FavoritesManager } from './FavoritesManager';
import { ScheduleForm } from './ScheduleForm';
import { TargetsForm } from './TargetsForm';

export default function AjustesPage() {
  const aboutId = useId();
  const data = useLiveQuery(async () => {
    const importedAt = (await db.meta.get('lastImportAt'))?.value;
    return { profile: await db.profile.get('me'), importedAt: typeof importedAt === 'string' ? importedAt : 'initial' };
  });
  const profile = data?.profile;
  // Forms keep local drafts, so an import remounts them with the restored profile.
  const generation = data?.importedAt;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-muted">Los valores iniciales son sugerencias; cambialos cuando quieras.</p>
      </header>
      {!profile ? (
        <Loading />
      ) : (
        <>
          <ScheduleForm key={`schedule-${generation}`} profile={profile} />
          <TargetsForm key={`targets-${generation}`} profile={profile} />
          <DietaryForm key={`dietary-${generation}`} profile={profile} />
        </>
      )}
      <FavoritesManager />
      <DataTransfer />
      <section aria-labelledby={aboutId} className={CARD}>
        <h2 id={aboutId} className="text-lg font-semibold">
          Acerca de
        </h2>
        <p className="mt-1 text-muted">Datos solo en este dispositivo. Sin cuentas, sin red, sin seguimiento.</p>
        <p className="mt-1 text-muted">Instalar en iPhone: Compartir → Agregar a inicio.</p>
      </section>
    </div>
  );
}
