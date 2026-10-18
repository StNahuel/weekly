export function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-3 py-6">
      <p className="text-sm text-muted">Cargando…</p>
      <div aria-hidden="true" className="h-8 w-2/3 rounded-full bg-surface-2/60" />
      <div aria-hidden="true" className="h-24 rounded-3xl bg-surface-2/60" />
      <div aria-hidden="true" className="h-24 rounded-3xl bg-surface-2/60" />
    </div>
  );
}
