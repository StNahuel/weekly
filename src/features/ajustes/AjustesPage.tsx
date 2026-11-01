import { ArrowLeft } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Loading } from '../../app/states/Loading';
import { CARD, LINK } from '../../app/ui';
import { saveSettings, useSettings } from '../../db/repo';
import { recipes } from '../../seed';
import { DataTransfer } from './DataTransfer';

export default function AjustesPage() {
  const displayId = useId();
  const aboutId = useId();
  const settings = useSettings();

  return (
    <div className="space-y-4">
      <Link to="/" className={LINK}>
        <ArrowLeft aria-hidden="true" size={20} />
        Volver
      </Link>
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <section aria-labelledby={displayId} className={`space-y-3 ${CARD}`}>
        <h2 id={displayId} className="text-lg font-semibold">
          Pantalla
        </h2>
        {settings ? (
          <label className="tap flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={settings.largeText}
              onChange={(event) => void saveSettings({ ...settings, largeText: event.target.checked })}
              className="h-5 w-5 accent-mint-ink"
            />
            Texto más grande
          </label>
        ) : (
          <Loading />
        )}
      </section>

      <DataTransfer />

      <section aria-labelledby={aboutId} className={CARD}>
        <h2 id={aboutId} className="text-lg font-semibold">
          Acerca de
        </h2>
        <p className="mt-1 text-muted">{`Recetario con ${recipes.length} preparaciones: desayunos, almuerzos y cenas, meriendas y jugos.`}</p>
        <p className="mt-1 text-muted">Los valores nutricionales son estimaciones; no es una indicación médica.</p>
        <p className="mt-1 text-muted">Datos solo en este dispositivo. Sin cuentas, sin red, sin seguimiento.</p>
        <p className="mt-1 text-muted">Instalar en iPhone: Safari → Compartir → Agregar a inicio.</p>
      </section>
    </div>
  );
}
