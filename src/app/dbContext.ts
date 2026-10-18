import { createContext, useContext } from 'react';

type DbStatus = { ready: boolean; error?: Error; retry: () => void };

export const DbContext = createContext<DbStatus | null>(null);

export function useDb(): DbStatus {
  const status = useContext(DbContext);
  if (!status) throw new Error('useDb must be used inside <DbProvider>');
  return status;
}
