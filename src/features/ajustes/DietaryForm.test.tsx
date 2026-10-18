import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import type { ProfileRecord } from '../../db/types';
import { freshProfile } from './ajustesTestUtils';
import { DietaryForm } from './DietaryForm';
import { getProfile } from '../../test/db';

let profile: ProfileRecord;

beforeEach(async () => {
  profile = await freshProfile();
});

test('excluding Bondiola de cerdo persists pork_shoulder; unchecking removes it', async () => {
  render(<DietaryForm profile={profile} />);
  expect(screen.queryByLabelText('Bondiola de cerdo')).toBeNull();
  expect(screen.queryByLabelText('Agua')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Ingredientes que no querés (0)' }));
  expect(screen.queryByLabelText('Agua')).toBeNull();

  await userEvent.click(screen.getByLabelText('Bondiola de cerdo'));
  await waitFor(async () => expect((await getProfile())?.dietary.excludedIngredientIds).toContain('pork_shoulder'));
  expect(screen.getByRole('button', { name: 'Ingredientes que no querés (1)' })).toBeInTheDocument();
  expect(screen.getByText('Bondiola de cerdo', { selector: 'p' })).toBeInTheDocument();

  await userEvent.click(screen.getByLabelText('Bondiola de cerdo'));
  await waitFor(async () => expect((await getProfile())?.dietary.excludedIngredientIds).toEqual([]));
  expect(screen.getByText('Ninguno')).toBeInTheDocument();
});

test('tag exclusions and the large-text preference are saved', async () => {
  render(<DietaryForm profile={profile} />);
  await userEvent.click(screen.getByLabelText('Comidas ocasionales'));
  await waitFor(async () => expect((await getProfile())?.dietary.excludedTags).toEqual(['occasional']));
  await userEvent.click(screen.getByLabelText('Texto más grande'));
  await waitFor(async () => expect((await getProfile())?.device.largeText).toBe(true));
  expect(screen.getByLabelText('Texto más grande')).toBeChecked();
});
