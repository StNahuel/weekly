import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useDb } from './dbContext';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorState } from './states/ErrorState';
import { Loading } from './states/Loading';
import { useProfile } from './useProfile';

export function AppShell() {
  const { ready, error, retry } = useDb();
  const { pathname } = useLocation();
  const largeText = useProfile()?.device.largeText === true;

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
  }, [largeText]);

  return (
    <>
      <main className="mx-auto w-full max-w-xl pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1rem+env(safe-area-inset-right))] pb-[calc(6.5rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))]">
        {error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : !ready ? (
          <Loading />
        ) : (
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        )}
      </main>
      <BottomNav />
    </>
  );
}
