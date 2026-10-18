import { Download, Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { BTN_DANGER } from '../../app/ui';
import { db } from '../../db';
import { buildExport, downloadExport } from '../../db/export';
import { applyImport, IMPORT_TOO_LARGE, MAX_IMPORT_CHARS, parseImport, type ParsedImport } from '../../db/import';
import { formatDateTime } from '../../domain/format';
import { ALERT, CARD, PRIMARY, SECONDARY } from './copy';

type Pending = Extract<ParsedImport, { ok: true }>;

export function DataTransfer() {
  const headingId = useId();
  const inputId = useId();
  const dialogTitleId = useId();
  const input = useRef<HTMLInputElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pending) cancelButton.current?.focus();
  }, [pending]);

  const clearInput = () => {
    if (input.current) input.current.value = '';
  };

  const exportNow = async () => {
    setError(null);
    try {
      downloadExport(await buildExport(db));
      setStatus('Respaldo descargado.');
    } catch {
      setStatus(null);
      setError('No se pudo crear el respaldo.');
    }
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    setPending(null);
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed: ParsedImport =
      file.size > MAX_IMPORT_CHARS ? { ok: false, error: IMPORT_TOO_LARGE } : parseImport(await file.text());
    if (parsed.ok) {
      setError(null);
      setPending(parsed);
    } else {
      setError(parsed.error);
      clearInput();
    }
  };

  const replace = async ({ data }: Pending) => {
    setBusy(true);
    try {
      await applyImport(db, data);
      setStatus('Datos importados.');
    } catch {
      setError('No se pudo importar el respaldo; tus datos no cambiaron.');
    } finally {
      setBusy(false);
      setPending(null);
      clearInput();
    }
  };

  const cancel = () => {
    setPending(null);
    clearInput();
    setStatus('Importación cancelada; no se cambió nada.');
  };

  return (
    <section aria-labelledby={headingId} className={`space-y-4 ${CARD}`}>
      <header>
        <h2 id={headingId} className="text-lg font-semibold">
          Respaldo
        </h2>
        <p className="text-sm text-muted">Guardá una copia en un archivo y recuperala cuando la necesites.</p>
      </header>
      <button type="button" onClick={() => void exportNow()} className={PRIMARY}>
        <Download aria-hidden="true" size={20} />
        Exportar respaldo (JSON)
      </button>
      <div className="space-y-1">
        <label htmlFor={inputId} className={`${SECONDARY} w-full cursor-pointer`}>
          <Upload aria-hidden="true" size={20} />
          Importar respaldo
        </label>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept="application/json"
          onChange={(event) => void choose(event)}
          className="sr-only"
        />
      </div>
      {error && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      {pending && (
        <div role="dialog" aria-labelledby={dialogTitleId} className={`space-y-3 ${ALERT}`}>
          <h3 id={dialogTitleId} className="font-semibold">
            ¿Reemplazar los datos de este dispositivo?
          </h3>
          <p>
            {`Se reemplazarán: ${pending.summary.days} días, ${pending.summary.favorites} favoritos, perfil ${
              pending.summary.hasProfile ? 'sí' : 'no'
            }. Exportado el ${formatDateTime(pending.summary.exportedAt)}.`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button ref={cancelButton} type="button" onClick={cancel} className={SECONDARY}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void replace(pending)}
              className={BTN_DANGER}
            >
              Reemplazar datos
            </button>
          </div>
        </div>
      )}
      <p role="status" className="text-sm font-semibold text-mint-ink">
        {status}
      </p>
    </section>
  );
}
