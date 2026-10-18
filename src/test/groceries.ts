import { screen } from '@testing-library/react';

const LABEL = /^(.*) — ([\d.,]+) g · (.*)$/;

export const parseGrams = (text: string) => Number(text.replaceAll('.', '').replace(',', '.'));

export function groceryGrams(): Map<string, number> {
  const entries = screen.queryAllByRole('checkbox').flatMap((box) => {
    const match = LABEL.exec(box.getAttribute('aria-label') ?? '');
    return match ? [[`${match[1]} · ${match[3]}`, parseGrams(match[2] ?? '')] as const] : [];
  });
  return new Map(entries);
}
