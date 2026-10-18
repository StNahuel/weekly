export function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-3 py-6">
      <p className="text-sm text-muted">Cargando…</p>
      <div aria-hidden="true" className="h-8 w-2/3 animate-pulse rounded-xl bg-surface-2" />
      <div aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-surface" />
      <div aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
