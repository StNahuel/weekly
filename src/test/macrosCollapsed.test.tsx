import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { renderApp, resetDb } from './render';

const DISCLAIMER = 'Estimación a partir de valores genéricos por 100 g; no es una etiqueta ni una indicación médica.';

beforeEach(resetDb);

test('¿Qué como? hides macros until Ver nutrición estimada is opened', async () => {
  await renderApp({ route: '/que-como' });
  const toggle = await screen.findByText('Ver nutrición estimada');
  expect(document.body).not.toHaveTextContent(/kcal/);
  expect(screen.queryByText(DISCLAIMER)).toBeNull();

  await userEvent.click(toggle);
  expect(document.body).toHaveTextContent(/≈ \d+ kcal/);
  expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('on Hoy a protein bar snack shows the incomplete-estimate warning only after expanding', async () => {
  await renderApp({ route: '/' });
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
  const snack = await screen.findByRole('region', { name: 'Merienda' });
  await userEvent.click(within(snack).getByRole('button', { name: 'Elegir' }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Elegir merienda' })).getByRole('button', { name: /Barra proteica y fruta/ }));
  // The picker dialog renders inside the slot section and lists the same title; wait for it to close
  // so the assertion targets the slot body, not the soon-to-be-detached option button.
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Elegir merienda' })).toBeNull());
  expect(await within(snack).findByText('Barra proteica y fruta')).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/kcal/);
  expect(screen.queryByText('Estimación incompleta')).toBeNull();

  await userEvent.click(within(snack).getByText('Ver nutrición estimada'));
  expect(within(snack).getByText(/kcal/)).toBeInTheDocument();
  expect(within(snack).getByText(DISCLAIMER)).toBeInTheDocument();
  expect(within(snack).getByText('Estimación incompleta')).toBeInTheDocument();
  expect(within(snack).getByText('Sin datos de etiqueta: Barra proteica (genérica)')).toBeInTheDocument();
});
