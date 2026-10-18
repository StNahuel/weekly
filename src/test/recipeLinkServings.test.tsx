import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { getLine } from '../features/cocinar/cocinarTestUtils';
import { putDay } from '../features/hoy/testDay';
import { renderApp, resetDb } from './render';

const MONDAY = new Date('2026-10-19T09:00:00-03:00');

async function expectRecipeAt(servings: string, shiitake: string) {
  const ingredients = within(await screen.findByRole('region', { name: 'Ingredientes' }));
  expect(await ingredients.findByText(`Shiitake — ${shiitake}`)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: servings })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('link', { name: 'Cocinar paso a paso' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
  getLine(`Shiitake — ${shiitake}`);
}

beforeEach(resetDb);

test('Ver receta from chicken + miso in ¿Qué como? opens one portion in the recipe and kitchen mode', async () => {
  await renderApp({ route: '/que-como', now: MONDAY });
  await userEvent.click(await screen.findByRole('button', { name: 'Cambiar proteína' }));
  await userEvent.click(
    within(screen.getByRole('list', { name: 'Proteínas disponibles' })).getByRole('button', { name: /Pechuga de pollo/ }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar acompañamiento' }));
  await userEvent.click(
    within(screen.getByRole('list', { name: 'Acompañamientos disponibles' })).getByRole('button', { name: /Sopa Miso/ }),
  );
  await userEvent.click(screen.getByRole('link', { name: 'Ver receta de Sopa Miso y shiitake' }));
  await expectRecipeAt('1', '40 g');
});

test('Ver receta from a two-portion soup slot in Hoy opens two portions', async () => {
  await putDay('2026-10-19', 'strength', { dinner: { kind: 'soup', soupId: 'miso', servings: 2 } });
  await renderApp({ now: MONDAY });
  await userEvent.click(await screen.findByRole('link', { name: 'Ver receta de Miso y shiitake' }));
  await expectRecipeAt('2', '80 g');
});
