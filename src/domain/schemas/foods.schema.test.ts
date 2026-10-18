import { describe, expect, test } from 'vitest';
import raw from '../../../data/foods.json';
import { foodsSchema } from './foods.schema';

describe('foodsSchema', () => {
  test('parses data/foods.json with the seed counts', () => {
    const foods = foodsSchema.parse(raw);
    expect(foods.ingredients).toHaveLength(68);
    expect(foods.proteins).toHaveLength(10);
    expect(foods.sides).toHaveLength(20);
    expect(foods.breakfasts).toHaveLength(6);
    expect(foods.snacks).toHaveLength(6);
  });

  test('rejects an unknown ingredient field', () => {
    const tampered = structuredClone(raw);
    expect(foodsSchema.safeParse(tampered).success).toBe(true);

    Object.assign(tampered.ingredients[0] ?? {}, { brand: 'x' });
    const result = foodsSchema.safeParse(tampered);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      code: 'unrecognized_keys',
      keys: ['brand'],
      path: ['ingredients', 0],
    });
  });
});
