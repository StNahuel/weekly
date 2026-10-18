import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db } from '../db';
import { DbContext } from './dbContext';

type LoadState = { ready: boolean; error?: Error };

export function DbProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ ready: false });

  useEffect(() => {
    let active = true;
    // Seeds load lazily so a seed parse error surfaces as an error state instead of a blank page.
    Promise.all([import('../db/hydrate'), import('../seed')])
      .then(([{ hydrate }, { seeds }]) => hydrate(db, seeds))
      .then(
        () => {
          if (active) setState({ ready: true });
        },
        (error: unknown) => {
          if (active) setState({ ready: false, error: error instanceof Error ? error : new Error(String(error)) });
        },
      );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ ready: false });
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(() => ({ ...state, retry }), [state, retry]);
  return <DbContext value={value}>{children}</DbContext>;
}
