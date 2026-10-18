import { describe, expect, test } from 'vitest';
import { STORE_CATEGORIES } from '../types';
import { aggregateGroceries, applyEdits, groupByCategory, type AggregatableLine } from './aggregate';

const rice: AggregatableLine = { ingredientId: 'rice_dry', name: 'Arroz', grams: 65, weightBasis: 'dry', category: 'Almacén' };
const chickpeasCooked: AggregatableLine = {
  ingredientId: 'chickpeas_cooked',
  name: 'Garbanzos cocidos, escurridos',
  grams: 120,
  weightBasis: 'cooked',
  category: 'Almacén',
};
const water: AggregatableLine = { ingredientId: 'water', name: 'Agua', grams: 250, weightBasis: 'ready', category: 'Líquidos' };
const salmon: AggregatableLine = { ingredientId: 'salmon', name: 'Salmón', grams: 220, weightBasis: 'raw', category: 'Pescadería' };
const broccoli: AggregatableLine = { ingredientId: 'broccoli', name: 'Brócoli', grams: 180, weightBasis: 'raw', category: 'Verdulería' };

describe('aggregateGroceries', () => {
  test('identical id and basis merge into one summed item', () => {
    expect(aggregateGroceries([rice, rice])).toEqual([{ ...rice, key: 'rice_dry|dry', grams: 130, purchasable: true }]);
  });

  test('the same id with a different basis stays separate', () => {
    const dry = { ...chickpeasCooked, grams: 50, weightBasis: 'dry' } as const;
    expect(aggregateGroceries([chickpeasCooked, dry]).map((i) => [i.key, i.grams])).toEqual([
      ['chickpeas_cooked|cooked', 120],
      ['chickpeas_cooked|dry', 50],
    ]);
    expect(aggregateGroceries([chickpeasCooked, { ...chickpeasCooked, grams: 50 }]).map((i) => [i.key, i.grams])).toEqual([
      ['chickpeas_cooked|cooked', 170],
    ]);
  });

  test('ready bone broth and vegetable concentrate never share a key', () => {
    const items = aggregateGroceries([
      { ingredientId: 'fondo_bone_ready', name: 'FONDO caldo de huesos', grams: 100, weightBasis: 'frozen_ready', category: 'Congelados' },
      { ingredientId: 'fondo_veg_concentrate', name: 'FONDO vegetal concentrado', grams: 5.5, weightBasis: 'frozen_concentrate', category: 'Almacén' },
    ]);
    expect(items.map((i) => i.key).sort()).toEqual(['fondo_bone_ready|frozen_ready', 'fondo_veg_concentrate|frozen_concentrate']);
  });

  test('water is kept but not purchasable', () => {
    const items = aggregateGroceries([water, rice]);
    expect(items.find((i) => i.ingredientId === 'water')?.purchasable).toBe(false);
    expect(items.find((i) => i.ingredientId === 'rice_dry')?.purchasable).toBe(true);
  });

  test('sums are rounded with the soup rounding rule', () => {
    const concentrate = { ...rice, ingredientId: 'fondo_veg_concentrate', weightBasis: 'frozen_concentrate', grams: 0.35 } as const;
    expect(aggregateGroceries([concentrate, concentrate])[0]?.grams).toBe(0.7);
    expect(aggregateGroceries([{ ...rice, grams: 10.2 }, { ...rice, grams: 0.1 }])[0]?.grams).toBe(10);
  });

  test('items are ordered by store category', () => {
    const items = aggregateGroceries([water, rice, salmon, broccoli]);
    expect(items.map((i) => i.category)).toEqual(['Verdulería', 'Pescadería', 'Almacén', 'Líquidos']);
    expect(groupByCategory(items).map((g) => [g.category, g.items.length])).toEqual([
      ['Verdulería', 1],
      ['Pescadería', 1],
      ['Almacén', 1],
      ['Líquidos', 1],
    ]);
    expect(STORE_CATEGORIES.indexOf('Verdulería')).toBe(0);
  });
});

describe('applyEdits', () => {
  test('removes keys and overrides grams without touching the rest', () => {
    const items = aggregateGroceries([rice, salmon, broccoli]);
    const edited = applyEdits(items, { removedKeys: ['broccoli|raw'], overrides: { 'salmon|raw': 300 } });
    expect(edited.map((i) => [i.key, i.grams])).toEqual([
      ['salmon|raw', 300],
      ['rice_dry|dry', 65],
    ]);
    expect(applyEdits(items, { removedKeys: [], overrides: {} })).toEqual(items);
  });
});
