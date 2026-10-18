import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { resolve, stepById } from '../../domain/soups/testHelpers';
import type { ResolvedStep } from '../../domain/soups/types';
import { seedTextEs } from './copy';
import { getLine } from './cocinarTestUtils';
import { NO_NEW_INGREDIENTS, StepCard } from './StepCard';
import { soups } from '../../seed/soups';

function renderStep(step: ResolvedStep, onToggleDone = () => {}) {
  render(<StepCard step={step} position={2} total={5} done={false} onToggleDone={onToggleDone} safetyOpen={false} />);
}

test('miso step 2 at two servings lists each new ingredient with grams and every control', () => {
  renderStep(stepById(resolve('miso', { servings: 2 }), 2));
  expect(screen.getByText('Paso 2 de 5')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Cocinar shiitake' })).toBeInTheDocument();
  const lines = within(screen.getByRole('list', { name: 'Ingredientes de este paso' }));
  expect(lines.getAllByRole('listitem')).toHaveLength(3);
  getLine('Agua — 567 g', lines);
  getLine('FONDO vegetal concentrado — 11 g', lines);
  getLine('Shiitake — 80 g', lines);
  const controls = within(screen.getByRole('list', { name: 'Ajustes indicativos' }));
  expect(controls.getByText('15 min')).toBeInTheDocument();
  expect(controls.getByText('95 °C')).toBeInTheDocument();
  expect(controls.getByText('Vel. 0,5')).toBeInTheDocument();
  expect(controls.getByText('Reversa si tu modelo lo permite')).toBeInTheDocument();
  expect(screen.getByText('Texto original: 15 minutos · 95 °C · Vel. 0.5 (reversa si disponible)')).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: 'Notas de seguridad' })).getAllByRole('listitem')).toHaveLength(1);
});

test('papa step 4 has no new ingredients, no heat and a gradual speed', () => {
  renderStep(stepById(resolve('papa', { servings: 2 }), 4));
  expect(screen.getByText(NO_NEW_INGREDIENTS)).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Ingredientes de este paso' })).toBeNull();
  const controls = within(screen.getByRole('list', { name: 'Ajustes indicativos' }));
  expect(controls.getByText('Sin calor')).toBeInTheDocument();
  expect(controls.getByText('Subir gradualmente hasta vel. 6')).toBeInTheDocument();
  expect(controls.getByText('20–30 s')).toBeInTheDocument();
  expect(controls.queryByText(/Reversa/)).toBeNull();
});

test('sesamo step 5 is mixed by hand and invents no time', () => {
  renderStep(stepById(resolve('sesamo'), 5));
  const controls = within(screen.getByRole('list', { name: 'Ajustes indicativos' }));
  expect(controls.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
    'Sin calor',
    'Mezclar a mano / sin programa',
  ]);
  expect(screen.queryByText(/\bmin\b/)).toBeNull();
  expect(screen.queryByRole('list', { name: 'Notas de seguridad' })).toBeNull();
});

test('a heated step without heatOff shows a temperature range and no Sin calor', () => {
  renderStep(stepById(resolve('thai'), 5));
  const controls = within(screen.getByRole('list', { name: 'Ajustes indicativos' }));
  expect(controls.getByText('85–90 °C')).toBeInTheDocument();
  expect(controls.queryByText('Sin calor')).toBeNull();
});

test('Marcar listo reports the toggle', async () => {
  const onToggleDone = vi.fn();
  renderStep(stepById(resolve('miso'), 1), onToggleDone);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Marcar listo' }));
  expect(onToggleDone).toHaveBeenCalledOnce();
});

test('the hot-jug banner sits on papa step 4 only when opened by default', () => {
  render(<StepCard step={stepById(resolve('papa'), 4)} position={4} total={5} done={false} onToggleDone={() => {}} safetyOpen />);
  expect(screen.getByText(seedTextEs(soups.safety.hotBlend))).toBeInTheDocument();
});
