import type { ReactNode } from 'react';

type EmptyProps = { title: string; hint?: string; action?: ReactNode };

export function Empty({ title, hint, action }: EmptyProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 text-center shadow-soft">
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
