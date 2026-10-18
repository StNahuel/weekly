import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../db';
import { hydrate } from '../../db/hydrate';
import { saveSoupPrefs } from '../../db/repo';
import { getRecipe, resolve } from '../../domain/soups/testHelpers';
import { seeds } from '../../seed';
import { clearDb, getPlan } from '../../test/db';
import { renderRoute } from './cocinarTestUtils';
import { ADDED_TO_LIST, MACHINE_NOTICE, capacityText, seedTextEs } from './copy';

beforeEach(async () => {
  await clearDb();
  await hydrate(db, seeds);
});

test('miso at two servings shows the liquid summary and scaled ingredients', async () => {
  renderRoute('/cocinar/miso');
  expect(await screen.findByRole('heading', { level: 1, name: 'Miso y shiitake' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '2' }));
  const liquids = within(screen.getByRole('region', { name: 'Directo a la iChef' }));
  await waitFor(() => expect(liquids.getByText('Agua — 567 g')).toBeInTheDocument());
  expect(liquids.getByText('FONDO vegetal concentrado — 11 g')).toBeInTheDocument();
  expect(liquids.getAllByRole('listitem')).toHaveLength(2);
  const ingredients = within(screen.getByRole('region', { name: 'Ingredientes' }));
  expect(ingredients.getByText('Shiitake — 80 g')).toBeInTheDocument();
  expect(ingredients.getByText('Miso de soja — 15 g')).toBeInTheDocument();
  expect(ingredients.getByText('Agua — 567 g')).toBeInTheDocument();
  expect(ingredients.getByRole('heading', { name: 'Verdulería' })).toBeInTheDocument();
  expect(screen.getByText(MACHINE_NOTICE)).toBeInTheDocument();
  expect(screen.getByText(capacityText(resolve('miso', { servings: 2 })))).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Cocinar paso a paso' })).toHaveAttribute('href', '/cocinar/miso/cocina?p=2');
  expect(document.body).not.toHaveTextContent(/kcal/);
});

test('bone broth lists ready bone broth and water separately', async () => {
  await saveSoupPrefs('miso', { brothType: 'bone_ready', boneBrothGramsFor3: 200 });
  renderRoute('/cocinar/miso?p=3');
  const liquids = within(await screen.findByRole('region', { name: 'Directo a la iChef' }));
  expect(liquids.getAllByRole('listitem').map((li) => li.firstChild?.textContent)).toEqual([
    'FONDO caldo de huesos — 200 g',
    'Agua — 650 g',
  ]);
});

test('coconut joins the liquid summary only where it is fixed', async () => {
  renderRoute('/cocinar/thai');
  const liquids = within(await screen.findByRole('region', { name: 'Directo a la iChef' }));
  expect(liquids.getByText(/^Leche de coco culinaria — \d+ g$/)).toBeInTheDocument();
});

test('tomate at four servings warns about the jug capacity', async () => {
  renderRoute('/cocinar/tomate?p=4');
  const soup = resolve('tomate', { servings: 4 });
  expect(soup.capacityWarning).toBe(true);
  expect(await screen.findByText(capacityText(soup))).toHaveTextContent(/^Atención: /);
  expect(screen.queryByText(/^Aprox\./)).toBeNull();
});

test('calabaza shows its documented adaptation in Spanish', async () => {
  renderRoute('/cocinar/calabaza');
  const [adaptation] = getRecipe('calabaza').provenance.adaptations;
  const list = within(await screen.findByRole('list', { name: 'Adaptaciones' }));
  expect(list.getByText(seedTextEs(adaptation ?? ''))).toHaveTextContent(/cúrcuma/);
  expect(screen.queryByText(/turmeric/i)).toBeNull();
});

test('a recipe without adaptations has no adaptation list', async () => {
  renderRoute('/cocinar/miso');
  await screen.findByRole('heading', { level: 1, name: 'Miso y shiitake' });
  expect(screen.queryByRole('list', { name: 'Adaptaciones' })).toBeNull();
});

test('Agregar a la lista de compras adds the soup at the chosen servings and confirms', async () => {
  renderRoute('/cocinar/miso?p=2');
  await userEvent.click(await screen.findByRole('button', { name: 'Agregar a la lista de compras' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(ADDED_TO_LIST));
  const plan = await getPlan();
  expect(plan?.meals.at(-1)?.slot).toEqual({ kind: 'soup', soupId: 'miso', servings: 2 });
});

test('an unknown recipe says so', async () => {
  renderRoute('/cocinar/ghost');
  expect(await screen.findByRole('heading', { name: 'Receta no encontrada' })).toBeInTheDocument();
});
