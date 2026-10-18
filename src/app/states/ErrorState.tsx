import { BTN_PRIMARY } from '../ui';

type ErrorStateProps = { error: Error; onRetry: () => void };

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-3xl border border-gold bg-surface p-5 shadow-soft">
      <p className="font-semibold">Algo falló al cargar los datos.</p>
      <p className="mt-1 text-sm text-muted">Probá de nuevo.</p>
      <details className="mt-2 text-sm text-muted">
        <summary>Detalles técnicos</summary>
        <p className="mt-1 break-words">{error.message}</p>
      </details>
      <button
        type="button"
        onClick={onRetry}
        className={`${BTN_PRIMARY} mt-4`}
      >
        Reintentar
      </button>
    </div>
  );
}
