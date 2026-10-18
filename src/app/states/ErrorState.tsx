type ErrorStateProps = { error: Error; onRetry: () => void };

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-2xl border border-gold/60 bg-surface p-5">
      <p className="font-semibold">Algo falló al cargar los datos.</p>
      <p className="mt-1 text-sm text-muted">Probá de nuevo.</p>
      <details className="mt-2 text-sm text-muted">
        <summary>Detalles técnicos</summary>
        <p className="mt-1 break-words">{error.message}</p>
      </details>
      <button
        type="button"
        onClick={onRetry}
        className="tap mt-4 rounded-xl bg-sage px-4 font-semibold text-bg"
      >
        Reintentar
      </button>
    </div>
  );
}
