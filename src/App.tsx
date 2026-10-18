import { RouterProvider } from 'react-router-dom';
import { DbProvider } from './app/DbProvider';
import { ErrorBoundary } from './app/ErrorBoundary';
import { createAppRouter } from './app/router';

const router = createAppRouter();

export default function App() {
  return (
    <ErrorBoundary>
      <DbProvider>
        <RouterProvider router={router} />
      </DbProvider>
    </ErrorBoundary>
  );
}
