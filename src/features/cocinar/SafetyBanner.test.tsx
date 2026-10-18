import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { resolve, stepById } from '../../domain/soups/testHelpers';
import { soups } from '../../seed/soups';
import { seedTextEs } from './copy';
import { SafetyBanner } from './SafetyBanner';

const hotBlend = seedTextEs(soups.safety.hotBlend);
const vapor = seedTextEs(soups.safety.vapor);

test('papa step 4 renders the hot-blend and vapor seed text when open', () => {
  render(<SafetyBanner controls={stepById(resolve('papa'), 4).controls} defaultOpen />);
  expect(screen.getByText(hotBlend)).toBeInTheDocument();
  expect(screen.getByText(vapor)).toBeInTheDocument();
  expect(hotBlend).toMatch(/^Nunca tritures a velocidad alta/);
});

test('miso step 1 (no heat, speed 5) renders no banner', () => {
  const { container } = render(<SafetyBanner controls={stepById(resolve('miso'), 1).controls} defaultOpen />);
  expect(container).toBeEmptyDOMElement();
});

test('a 95 °C step gets a collapsed banner that expands on tap', async () => {
  render(<SafetyBanner controls={stepById(resolve('miso'), 2).controls} defaultOpen={false} />);
  const toggle = screen.getByRole('button', { name: 'Seguridad con la jarra caliente' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText(hotBlend)).toBeNull();
  await userEvent.click(toggle);
  expect(screen.getByText(hotBlend)).toBeInTheDocument();
});

test('an 85 °C step stays without a banner', () => {
  const { container } = render(<SafetyBanner controls={stepById(resolve('miso'), 3).controls} defaultOpen />);
  expect(container).toBeEmptyDOMElement();
});
