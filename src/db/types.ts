import type { ShoppingEntry } from '../domain/recipes/shopping';
import type { BrothType } from '../domain/recipes/types';

// Keyed by the embedded soup id (e.g. "soup_miso"): broth and the optional ingredient apply to the soup
// wherever it is cooked.
export type SoupPrefRecord = { recipeId: string; brothType: BrothType; includeOptional: boolean };

export type ShoppingRecord = { id: 'current'; entries: ShoppingEntry[]; checked: string[]; updatedAt: string };

export type Settings = { largeText: boolean };

export type MetaRecord = { key: string; value: unknown };
