import { describe, expect, test } from 'vitest';
import { ingredientById } from '../../seed/foods';
import { resolveSoup } from './resolveSoup';
import { allVariants, defaultOptions, getRecipe, gramsById, idGrams, resolve, stepById } from './testHelpers';

describe('resolveSoup liquids', () => {
  test('vegetable broth splits water and concentrate', () => {
    expect(resolve('miso', { servings: 2 }).liquids).toMatchObject({ water: 567, concentrate: 11, boneBroth: 0 });
    expect(resolve('thai', { servings: 1 }).liquids).toMatchObject({ water: 243, concentrate: 6, coconut: 40 });
    expect(resolve('thai', { servings: 3 }).liquids).toMatchObject({ water: 730, concentrate: 18, coconut: 120 });
    expect(resolve('calabaza').liquids).toMatchObject({ concentrate: 19, coconut: 90 });
    expect(resolve('boniato').liquids).toMatchObject({ coconut: 75 });
  });

  test('bone broth scales the default 300 g for 3 and fills the rest with water', () => {
    expect(resolve('miso', { servings: 2, brothType: 'bone_ready' }).liquids).toMatchObject({
      boneBroth: 200,
      water: 367,
    });
    expect(resolve('papa').liquids).toMatchObject({ boneBroth: 300, water: 550 });
    expect(resolve('papa', { servings: 1 }).liquids).toMatchObject({ boneBroth: 100, water: 183 });
  });

  test('bone override is scaled and clamped to the broth liquid', () => {
    expect(resolve('papa', { servings: 2, boneBrothGramsFor3: 450 }).liquids).toMatchObject({
      boneBroth: 300,
      water: 267,
    });
    expect(resolve('papa', { boneBrothGramsFor3: 900 }).liquids).toMatchObject({ boneBroth: 850, water: 0 });
    expect(resolve('papa', { boneBrothGramsFor3: -50 }).liquids).toMatchObject({ boneBroth: 0, water: 850 });
  });

  test('concentrate override is scaled and clamped to 0.1–100 g for 3', () => {
    expect(resolve('verde', { servings: 2, concentrateGramsFor3: 30 }).liquids).toMatchObject({
      water: 567,
      concentrate: 20,
    });
    expect(resolve('verde', { concentrateGramsFor3: 250 }).liquids.concentrate).toBe(100);
    expect(resolve('verde', { concentrateGramsFor3: 0 }).liquids.concentrate).toBe(0.1);
  });

  test('coconut never changes the broth liquid', () => {
    const thai = getRecipe('thai');
    expect(resolve('thai').liquids.brothLiquid).toBe(thai.broth.baseBrothComponentGramsFor3);
    expect(resolve('miso').liquids.coconut).toBe(0);
  });
});

describe('resolveSoup steps', () => {
  test('computed broth expands into separate water and concentrate lines before step ingredients', () => {
    const miso = resolve('miso', { servings: 2 });
    expect(idGrams(stepById(miso, 2).additions)).toEqual([
      ['water', 567],
      ['fondo_veg_concentrate', 11],
      ['shiitake', 80],
    ]);
    expect(idGrams(stepById(miso, 4).additions)).toEqual([['miso_soy', 15]]);
  });

  test('bone broth lists ready bone broth then water', () => {
    expect(idGrams(stepById(resolve('papa'), 3).additions)).toEqual([
      ['fondo_bone_ready', 300],
      ['water', 550],
      ['potato', 150],
      ['red_lentils_dry', 20],
    ]);
  });

  test('a zero-gram broth line is omitted', () => {
    const roles = stepById(resolve('papa', { boneBrothGramsFor3: 900 }), 3).additions.map((a) => a.role);
    expect(roles).toEqual(['bone_broth', 'ingredient', 'ingredient']);
  });

  test('blend-only steps have no additions', () => {
    expect(stepById(resolve('papa'), 4).additions).toHaveLength(0);
  });

  test('the selected thai legume sets its line, controls and variant', () => {
    const edamame = stepById(resolve('thai', { thaiLegume: 'edamame' }), 6);
    expect(idGrams(edamame.additions)).toEqual([['edamame_cooked', 45]]);
    expect(edamame.controls.durationSecondsRange).toEqual([300, 420]);
    expect(edamame.controls.temperatureCRange).toEqual([95, 95]);
    expect(edamame.legumeVariant).toBe('edamame');

    const chickpeas = stepById(resolve('thai', { thaiLegume: 'chickpeas' }), 6);
    expect(idGrams(chickpeas.additions)).toEqual([['chickpeas_cooked', 45]]);
    expect(chickpeas.controls.durationSecondsRange).toEqual([120, 180]);
    expect(chickpeas.legumeVariant).toBe('chickpeas');

    expect(stepById(resolve('thai', { thaiLegume: 'edamame' }), 5).legumeVariant).toBeUndefined();
  });

  test('a legume addition without a selected legume adds nothing', () => {
    const recipe = structuredClone(getRecipe('thai'));
    for (const step of recipe.steps) delete step.condition;
    const soup = resolveSoup(recipe, defaultOptions(recipe), ingredientById);
    expect(stepById(soup, 6).additions).toEqual([]);
    expect(stepById(soup, 6).legumeVariant).toBeUndefined();
  });

  test('ingredient lines carry catalog name, basis and category', () => {
    expect(stepById(resolve('miso', { servings: 2 }), 2).additions[2]).toEqual({
      ingredientId: 'shiitake',
      name: ingredientById.get('shiitake')?.name,
      grams: 80,
      weightBasis: ingredientById.get('shiitake')?.weightBasis,
      category: ingredientById.get('shiitake')?.category,
      role: 'ingredient',
    });
  });
});

describe('resolveSoup totals', () => {
  test('miso for 2 agrees across steps, totals and shopping', () => {
    const miso = resolve('miso', { servings: 2 });
    expect(gramsById(miso.totals)).toMatchObject({
      shiitake: 80,
      miso_soy: 15,
      water: 567,
      fondo_veg_concentrate: 11,
    });
    expect(gramsById(miso.shopping)).toMatchObject({ shiitake: 80, miso_soy: 15, fondo_veg_concentrate: 11 });
  });

  test('totals equal the per-ingredient sum of step additions for every variant', () => {
    for (const { recipe, options } of allVariants()) {
      const soup = resolveSoup(recipe, options, ingredientById);
      const fromSteps: Record<string, number> = {};
      for (const a of soup.steps.flatMap((s) => s.additions)) {
        fromSteps[a.ingredientId] = Math.round(((fromSteps[a.ingredientId] ?? 0) + a.grams) * 10) / 10;
      }
      expect(gramsById(soup.totals), `${recipe.id} ${JSON.stringify(options)}`).toEqual(fromSteps);
    }
  });

  test('shopping drops water that totals keep', () => {
    for (const { recipe, options } of allVariants()) {
      const soup = resolveSoup(recipe, options, ingredientById);
      expect(soup.totals.some((a) => a.ingredientId === 'water')).toBe(true);
      expect(soup.shopping.some((a) => a.ingredientId === 'water')).toBe(false);
      expect(soup.shopping).toHaveLength(soup.totals.length - 1);
    }
  });

  test('capacity warning trips at 1650 g of resolved ingredients', () => {
    expect(resolve('tomate', { servings: 4 })).toMatchObject({ totalGrams: 1701, capacityWarning: true });
    expect(resolve('calabaza', { servings: 4 })).toMatchObject({ totalGrams: 1649.2, capacityWarning: false });
    expect(resolve('miso')).toMatchObject({ totalGrams: 1067, capacityWarning: false });
  });

  test('rejects servings outside the recipe range', () => {
    const recipe = getRecipe('miso');
    const options = { ...defaultOptions(recipe), servings: 4 } as const;
    expect(resolveSoup(recipe, options, ingredientById).servings).toBe(4);
    expect(() => resolveSoup({ ...recipe, maxServings: 3 }, options, ingredientById)).toThrow(
      'Soup miso supports 1–3 servings, got 4',
    );
  });

  test('rejects ingredients missing from the catalog', () => {
    const recipe = getRecipe('miso');
    const catalog = new Map(ingredientById);
    expect(resolveSoup(recipe, defaultOptions(recipe), catalog).recipeId).toBe('miso');
    catalog.delete('shiitake');
    expect(() => resolveSoup(recipe, defaultOptions(recipe), catalog)).toThrow(
      'Soup miso references unknown ingredient "shiitake"',
    );
  });
});
