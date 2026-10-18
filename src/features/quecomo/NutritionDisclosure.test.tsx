import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { NutritionDisclosure } from './NutritionDisclosure';

const SALMON = [{ ingredientId: 'salmon', grams: 220 }];

test('macros stay out of the DOM until the summary is opened', async () => {
  const { container } = render(<NutritionDisclosure lines={SALMON} />);
  const summary = screen.getByText('Ver nutrición estimada');
  expect(summary).toHaveAttribute('aria-expanded', 'false');
  expect(container).not.toHaveTextContent(/kcal/);

  await userEvent.click(summary);
  expect(summary).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('≈ 458 kcal · 44 g prot · 0 g carb · 29 g grasa')).toBeInTheDocument();
  expect(
    screen.getByText('Estimación a partir de valores genéricos por 100 g; no es una etiqueta ni una indicación médica.'),
  ).toBeInTheDocument();
  expect(screen.queryByText('Estimación incompleta')).toBeNull();

  await userEvent.click(summary);
  expect(container).not.toHaveTextContent(/kcal/);
});

test('a line without label data marks the estimate incomplete and names it', async () => {
  render(<NutritionDisclosure lines={[...SALMON, { ingredientId: 'curry_paste', grams: 10 }]} />);
  expect(screen.queryByText('Estimación incompleta')).toBeNull();

  await userEvent.click(screen.getByText('Ver nutrición estimada'));
  expect(screen.getByText('Estimación incompleta')).toBeInTheDocument();
  expect(screen.getByText('Sin datos de etiqueta: Pasta de curry verde o amarillo')).toBeInTheDocument();
});
