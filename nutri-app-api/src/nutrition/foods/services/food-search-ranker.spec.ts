import type { FoodSummarySource } from '../sources/food-summary.source.js';
import { rankFoodSearchResults } from './food-search-ranker.js';
import { resolveFoodPresentation } from './food-presentation.service.js';

const category = { id: 'category-1', name: 'Food', description: null };

function food(
  id: string,
  name: string,
  overrides: Partial<FoodSummarySource> = {},
): FoodSummarySource {
  return { id, name, category, ...overrides };
}

describe('food search ranking', () => {
  it('ranks display-name matches ahead of canonical-only matches', () => {
    const ranked = rankFoodSearchResults(
      [
        food('canonical', 'Egg, whole, raw, frozen, pasteurized', {
          displayName: 'Egg',
          variantLabel: 'Whole · Raw · Frozen · Pasteurized',
        }),
        food('specialty', 'Egg, whole, raw, frozen, pasteurized, liquid', {
          displayName: 'Frozen Egg',
        }),
        food('other', 'Chicken egg substitute', {
          displayName: 'Egg Substitute',
        }),
      ],
      'egg',
    );

    expect(ranked.map(({ id }) => id)).toEqual([
      'canonical',
      'other',
      'specialty',
    ]);
  });

  it('matches aliases and uses priority as a deterministic tie-breaker', () => {
    const ranked = rankFoodSearchResults(
      [
        food('low', 'Chickpeas, mature seeds, cooked', {
          displayName: 'Chickpeas',
          searchAliases: ['garbanzo beans'],
          searchPriority: 1,
        }),
        food('high', 'Chickpeas, mature seeds, canned', {
          displayName: 'Chickpeas',
          searchAliases: ['garbanzo beans'],
          searchPriority: 10,
        }),
      ],
      'garbanzo beans',
    );

    expect(ranked.map(({ id }) => id)).toEqual(['high', 'low']);
  });

  it('prefers the ordinary variant when derived display names are otherwise identical', () => {
    const ranked = rankFoodSearchResults(
      [
        food('frozen', 'Egg, whole, raw, frozen, pasteurized', {
          displayName: 'Egg',
          variantLabel: 'Whole · Raw · Frozen · Pasteurized',
          searchPriority: -2,
        }),
        food('ordinary', 'Egg, whole, raw', {
          displayName: 'Egg',
          variantLabel: 'Whole · Raw',
          searchPriority: 0,
        }),
      ],
      'egg',
    );

    expect(ranked.map(({ id }) => id)).toEqual(['ordinary', 'frozen']);
  });

  it('supports multi-word searches against derived display names', () => {
    const ranked = rankFoodSearchResults(
      [
        food(
          'chicken',
          'Chicken, broilers or fryers, breast, meat only, cooked',
          { displayName: 'Chicken Breast' },
        ),
        food('other', 'Chicken, broilers or fryers, thigh, meat only, cooked', {
          displayName: 'Chicken Thigh',
        }),
      ],
      'chicken breast',
    );

    expect(ranked[0]?.id).toBe('chicken');
  });

  it('orders common egg results before preparations, bird eggs, and industrial variants', () => {
    const names = [
      ['ordinary', 'Egg, whole, raw, fresh'],
      ['white', 'Egg, white, raw'],
      ['yolk', 'Egg, yolk, raw'],
      ['hard-boiled', 'Egg, whole, cooked, hard-boiled'],
      ['fried', 'Egg, whole, cooked, fried'],
      ['scrambled', 'Egg, whole, cooked, scrambled'],
      ['duck', 'Egg, duck, whole, fresh, raw'],
      ['quail', 'Egg, quail, whole, fresh, raw'],
      ['frozen', 'Egg, whole, raw, frozen, pasteurized'],
      ['dried', 'Egg, whole, dried'],
    ] as const;

    const ranked = rankFoodSearchResults(
      names.map(([id, canonicalName]) => {
        const presentation = resolveFoodPresentation(canonicalName);
        return food(id, canonicalName, {
          displayName: presentation.displayName,
          variantLabel: presentation.variantLabel,
          searchPriority: presentation.searchPriority,
        });
      }),
      'egg',
    );

    expect(ranked.map(({ id }) => id)).toEqual([
      'ordinary',
      'white',
      'yolk',
      'hard-boiled',
      'fried',
      'scrambled',
      'duck',
      'quail',
      'dried',
      'frozen',
    ]);
  });

  it('surfaces a specialty variant when the query explicitly names it', () => {
    const ordinaryName = 'Egg, whole, raw, fresh';
    const frozenName = 'Egg, whole, raw, frozen, pasteurized';
    const ranked = rankFoodSearchResults(
      [ordinaryName, frozenName].map((canonicalName) => {
        const presentation = resolveFoodPresentation(canonicalName);
        return food(canonicalName, canonicalName, {
          displayName: presentation.displayName,
          variantLabel: presentation.variantLabel,
          searchPriority: presentation.searchPriority,
        });
      }),
      'frozen',
    );

    expect(ranked[0]?.name).toBe(frozenName);
  });

  it('ranks branded products by food name while supporting explicit brand searches', () => {
    const branded = food('kfc', 'KFC, Fried Chicken, EXTRA CRISPY, Breast', {
      displayName: 'Fried Chicken',
      variantLabel: 'KFC · Extra Crispy · Breast',
    });
    const generic = food(
      'generic',
      'Chicken, broilers or fryers, breast, meat only, cooked',
      { displayName: 'Chicken Breast' },
    );

    expect(
      rankFoodSearchResults([generic, branded], 'fried chicken')[0]?.id,
    ).toBe('kfc');
    expect(rankFoodSearchResults([generic, branded], 'kfc')[0]?.id).toBe('kfc');
  });

  it('prioritizes oatmeal itself over oatmeal compound foods', () => {
    const names = [
      ['oatmeal', 'Oatmeal, cooked'],
      ['bread', 'Bread, oatmeal'],
      ['cookie', 'Cookies, oatmeal'],
      ['squares', 'Cereals ready-to-eat, QUAKER, Oatmeal Squares'],
    ] as const;
    const foods = names.map(([id, canonicalName]) => {
      const presentation = resolveFoodPresentation(canonicalName);
      return food(id, canonicalName, {
        displayName: presentation.displayName,
        variantLabel: presentation.variantLabel,
        searchPriority: presentation.searchPriority,
      });
    });

    expect(rankFoodSearchResults(foods, 'oatmeal').map(({ id }) => id)).toEqual(
      ['oatmeal', 'bread', 'cookie', 'squares'],
    );
    expect(rankFoodSearchResults(foods, 'oatmeal cookie')[0]?.id).toBe(
      'cookie',
    );
  });

  it('prioritizes primary food concepts over ingredient-modifier compounds generically', () => {
    const foods = [
      food('egg', 'Egg, whole, raw', { displayName: 'Egg' }),
      food('white', 'Egg, white, raw', {
        displayName: 'Egg White',
        searchPriority: 2,
      }),
      food('yolk', 'Egg, yolk, raw', {
        displayName: 'Egg Yolk',
        searchPriority: 1,
      }),
      food('scrambled', 'Egg, whole, cooked, scrambled', {
        displayName: 'Scrambled Egg',
      }),
      food('bread', 'Bread, egg', { displayName: 'Egg Bread' }),
      food('bagel', 'Bagel, egg', { displayName: 'Egg Bagel' }),
      food('roll', 'Roll, egg', { displayName: 'Egg Roll' }),
      food('sandwich', 'Sandwich, chicken', { displayName: 'Chicken Sandwich' }),
      food('breast', 'Chicken, breast, cooked', { displayName: 'Chicken Breast' }),
    ];

    const eggResults = rankFoodSearchResults(foods.slice(0, 7), 'egg').map(
      ({ id }) => id,
    );
    expect(eggResults.slice(0, 4)).toEqual([
      'egg',
      'white',
      'yolk',
      'scrambled',
    ]);
    expect(new Set(eggResults.slice(4))).toEqual(
      new Set(['bagel', 'bread', 'roll']),
    );
    expect(rankFoodSearchResults(foods.slice(7), 'chicken').map(({ id }) => id)).toEqual([
      'breast',
      'sandwich',
    ]);
  });
});
