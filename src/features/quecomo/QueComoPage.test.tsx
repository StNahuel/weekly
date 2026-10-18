import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { formatGrams } from '../../domain/format';
import { resolve } from '../../domain/soups/testHelpers';
import { foods } from '../../seed/foods';
import { clearDb } from '../../test/db';
import { putDay } from '../hoy/testDay';
import { BASIS_LABELS } from '../shared/basisLabels';
import { EMPTY_COMBO_TEXT, LOCKED_MISMATCH_TEXT } from './ComboPicker';
import { renderQueComo } from './queComoTestUtils';

beforeEach(clearDb);

test('chicken + miso soup shows the same one-serving grams as resolveSoup', async () => {
  renderQueComo();
  await userEvent.click(await screen.findByRole('button', { name: 'Cambiar proteína' }));
  await userEvent.click(
    within(screen.getByRole('list', { name: 'Proteínas disponibles' })).getByRole('button', {
      name: /Pechuga de pollo a la plancha/,
    }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar acompañamiento' }));
  await userEvent.click(
    within(screen.getByRole('list', { name: 'Acompañamientos disponibles' })).getByRole('button', {
      name: /Sopa Miso y shiitake/,
    }),
  );

  const soup = resolve('miso', { servings: 1 });
  const shiitake = soup.totals.find((a) => a.ingredientId === 'shiitake');
  const concentrate = soup.totals.find((a) => a.ingredientId === 'fondo_veg_concentrate');
  expect(shiitake?.grams).toBe(40);
  expect(concentrate?.grams).toBe(5.5);

  const combo = screen.getByRole('region', { name: 'Combinación' });
  expect(within(combo).getByRole('heading', { level: 2 })).toHaveTextContent(
    'Pechuga de pollo a la plancha + Sopa Miso y shiitake',
  );
  for (const line of soup.totals) {
    expect(
      within(combo).getByText(`${line.name} — ${formatGrams(line.grams)} (${BASIS_LABELS[line.weightBasis]})`),
    ).toBeInTheDocument();
  }
});

test('Usar on a favorite loads it and nutrition stays collapsed until opened', async () => {
  renderQueComo();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Usar Salmón al horno + sopa de puerro y arvejas' }),
  );
  const combo = screen.getByRole('region', { name: 'Combinación' });
  expect(within(combo).getByText('Salmón — 220 g (crudo)')).toBeInTheDocument();
  expect(within(combo).getByText('Sopa Puerro y arvejas (1 porción)')).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/kcal/);

  await userEvent.click(screen.getByText('Ver nutrición estimada'));
  expect(document.body).toHaveTextContent(/kcal/);
  expect(screen.getByText('Estimación incompleta')).toBeInTheDocument();
});

describe('filter changes and locks', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const combo = () => screen.getByRole('region', { name: 'Combinación' });
  const heading = () => within(combo()).getByRole('heading', { level: 2 }).textContent ?? '';
  const shownSide = () => foods.sides.find((s) => heading().endsWith(` + ${s.title}`));
  const shownProtein = () => foods.proteins.find((p) => heading().startsWith(`${p.title} + `));
  const timeFilter = () => screen.getByRole('combobox', { name: 'Tiempo disponible' });

  async function pickSalmon() {
    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar proteína' }));
    await userEvent.click(
      within(screen.getByRole('list', { name: 'Proteínas disponibles' })).getByRole('button', { name: /Salmón al horno/ }),
    );
  }

  test('the locked initial protein stays shown and pressed from Descanso to Sin tiempo / trabajo', async () => {
    renderQueComo();
    await screen.findByRole('region', { name: 'Combinación' });
    expect(shownProtein()?.id).toBe('chicken');
    await userEvent.click(within(combo()).getByRole('button', { name: 'Fijar proteína' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descanso' }));
    expect(shownProtein()?.id).toBe('chicken');
    expect(within(combo()).queryByText(LOCKED_MISMATCH_TEXT)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Sin tiempo / trabajo' }));
    expect(shownProtein()?.id).toBe('chicken');
    expect(within(combo()).getByRole('button', { name: 'Fijar proteína' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(combo()).getByText(LOCKED_MISMATCH_TEXT)).toBeInTheDocument();
    expect(shownSide()?.prepMinutes).toBeLessThanOrEqual(15);
  });

  test('an unlocked salmon pair is kept by 45 min and Sin límite, and replaced by 15 min', async () => {
    renderQueComo();
    await pickSalmon();
    await userEvent.selectOptions(timeFilter(), '45');
    expect(heading()).toContain('Salmón');
    await userEvent.selectOptions(timeFilter(), 'Sin límite');
    expect(heading()).toContain('Salmón');

    await userEvent.selectOptions(timeFilter(), '15');
    expect(heading()).not.toContain('Salmón');
    expect(shownProtein()?.prepMinutes).toBeLessThanOrEqual(15);
    expect(shownSide()?.prepMinutes).toBeLessThanOrEqual(15);
  });

  test('a locked salmon that fails 15 min stays with a hint while the unlocked side is re-picked', async () => {
    renderQueComo();
    await pickSalmon();
    await userEvent.click(within(combo()).getByRole('button', { name: 'Fijar proteína' }));
    expect(within(combo()).queryByText(LOCKED_MISMATCH_TEXT)).toBeNull();
    await userEvent.selectOptions(timeFilter(), '15');
    expect(shownProtein()?.id).toBe('salmon');
    expect(shownSide()?.prepMinutes).toBeLessThanOrEqual(15);
    expect(within(combo()).getByText(LOCKED_MISMATCH_TEXT)).toBeInTheDocument();
  });

  test('both locked keeps the pair through a filter change', async () => {
    renderQueComo();
    await pickSalmon();
    const before = heading();
    await userEvent.click(within(combo()).getByRole('button', { name: 'Fijar proteína' }));
    await userEvent.click(within(combo()).getByRole('button', { name: 'Fijar acompañamiento' }));
    await userEvent.selectOptions(timeFilter(), '15');
    expect(heading()).toBe(before);
    expect(within(combo()).getByText(LOCKED_MISMATCH_TEXT)).toBeInTheDocument();
  });

  test('filters that leave nothing show the empty message, and relaxing them shows a pair again', async () => {
    renderQueComo();
    await userEvent.click(await screen.findByRole('button', { name: 'Solo favoritos' }));
    await userEvent.selectOptions(timeFilter(), '15');
    expect(screen.getByText(EMPTY_COMBO_TEXT)).toBeInTheDocument();
    await userEvent.selectOptions(timeFilter(), 'Sin límite');
    expect(heading()).toBe('Salmón al horno + sopa de puerro y arvejas');
  });

  const lockButton = (part: 'proteína' | 'acompañamiento') => within(combo()).getByRole('button', { name: `Fijar ${part}` });

  test('without a lock, picking from the open Cambiar list replaces the protein', async () => {
    renderQueComo();
    await pickSalmon();
    expect(shownProtein()?.id).toBe('salmon');
  });

  test('locking while the Cambiar list is open closes it and the protein stays', async () => {
    renderQueComo();
    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar proteína' }));
    const salmon = within(screen.getByRole('list', { name: 'Proteínas disponibles' })).getByRole('button', {
      name: /Salmón al horno/,
    });
    await userEvent.click(lockButton('proteína'));
    expect(screen.queryByRole('list', { name: 'Proteínas disponibles' })).toBeNull();
    fireEvent.click(salmon);
    expect(shownProtein()?.id).toBe('chicken');
    expect(lockButton('proteína')).toHaveAttribute('aria-pressed', 'true');
  });

  test('unlocking under Sin límite keeps salmon', async () => {
    renderQueComo();
    await pickSalmon();
    await userEvent.click(lockButton('proteína'));
    await userEvent.click(lockButton('proteína'));
    expect(shownProtein()?.id).toBe('salmon');
  });

  test('unlocking a protein that fails 15 min re-picks it right away', async () => {
    renderQueComo();
    await pickSalmon();
    await userEvent.click(lockButton('proteína'));
    await userEvent.selectOptions(timeFilter(), '15');
    expect(shownProtein()?.id).toBe('salmon');
    await userEvent.click(lockButton('proteína'));
    expect(lockButton('proteína')).toHaveAttribute('aria-pressed', 'false');
    expect(shownProtein()?.prepMinutes).toBeLessThanOrEqual(15);
    expect(within(combo()).queryByText(LOCKED_MISMATCH_TEXT)).toBeNull();
  });

  test('a locked salmon with no side left shows the side empty message and blocks saving until Sin límite', async () => {
    await putDay('2026-10-19', 'strength');
    renderQueComo();
    await userEvent.click(await screen.findByRole('button', { name: 'Solo favoritos' }));
    expect(heading()).toBe('Salmón al horno + sopa de puerro y arvejas');
    await userEvent.click(lockButton('proteína'));
    await userEvent.selectOptions(timeFilter(), '15');

    expect(heading()).toBe('Salmón al horno');
    expect(within(combo()).getByText('Salmón — 220 g (crudo)')).toBeInTheDocument();
    expect(within(combo()).getByText(EMPTY_COMBO_TEXT)).toBeInTheDocument();
    expect(lockButton('proteína')).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['Guardar en almuerzo', 'Guardar en cena', 'Favorito']) {
      expect(within(combo()).getByRole('button', { name })).toBeDisabled();
    }

    await userEvent.selectOptions(timeFilter(), 'Sin límite');
    expect(heading()).toBe('Salmón al horno + sopa de puerro y arvejas');
    expect(within(combo()).queryByText(EMPTY_COMBO_TEXT)).toBeNull();
    for (const name of ['Guardar en almuerzo', 'Guardar en cena', 'Favorito']) {
      expect(within(combo()).getByRole('button', { name })).toBeEnabled();
    }
  });

  test('a locked side with no protein left shows the protein empty message, and unlocking restores a pair', async () => {
    renderQueComo();
    await screen.findByRole('region', { name: 'Combinación' });
    const side = shownSide();
    await userEvent.click(lockButton('acompañamiento'));
    await userEvent.click(screen.getByRole('button', { name: 'Solo favoritos' }));
    expect(heading()).toBe(side?.title);
    expect(within(combo()).getByText(EMPTY_COMBO_TEXT)).toBeInTheDocument();
    await userEvent.click(lockButton('acompañamiento'));
    expect(heading()).toBe('Salmón al horno + sopa de puerro y arvejas');
  });
});
