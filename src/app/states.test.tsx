import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { Empty } from './states/Empty';
import { Loading } from './states/Loading';

afterEach(() => {
  vi.restoreAllMocks();
});

test('ErrorBoundary shows the Spanish error state, keeps the raw message under Detalles técnicos, and Reintentar re-renders', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let shouldThrow = true;
  function Child() {
    if (shouldThrow) throw new Error('seed');
    return <p>contenido</p>;
  }
  render(
    <ErrorBoundary>
      <Child />
    </ErrorBoundary>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Algo falló al cargar los datos.');
  const details = screen.getByText('Detalles técnicos').closest('details');
  expect(details).not.toHaveAttribute('open');
  expect(details).toHaveTextContent('seed');

  shouldThrow = false;
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(screen.getByText('contenido')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('ErrorBoundary renders children when nothing throws', () => {
  render(
    <ErrorBoundary>
      <p>contenido</p>
    </ErrorBoundary>,
  );
  expect(screen.getByText('contenido')).toBeInTheDocument();
});

test('Loading is a busy status with text', () => {
  render(<Loading />);
  const status = screen.getByRole('status');
  expect(status).toHaveAttribute('aria-busy', 'true');
  expect(status).toHaveTextContent('Cargando…');
});

test('Empty shows title, hint and action', () => {
  render(<Empty title="Sin opciones" hint="Probá quitar filtros." action={<button type="button">Quitar</button>} />);
  expect(screen.getByText('Sin opciones')).toBeInTheDocument();
  expect(screen.getByText('Probá quitar filtros.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument();
});

test('Empty without hint or action renders only the title', () => {
  const { container } = render(<Empty title="Sin opciones" />);
  expect(container.querySelectorAll('p')).toHaveLength(1);
  expect(screen.queryByRole('button')).toBeNull();
});
