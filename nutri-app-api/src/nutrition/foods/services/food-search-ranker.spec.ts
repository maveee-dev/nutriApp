import type { FoodSummarySource } from '../sources/food-summary.source.js';
import {
  diversifyFoodSearchResults,
  rankFoodSearchResults,
} from './food-search-ranker.js';
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

  it('matches meaningful tokens anywhere in promoted food titles', () => {
    const foods = [
      food('white-rice', 'Rice, white, cooked', { displayName: 'White Rice' }),
      food('brown-rice', 'Rice, brown, cooked', { displayName: 'Brown Rice' }),
      food('whole-milk', 'Milk, whole', { displayName: 'Whole Milk' }),
      food('cheddar', 'Cheese, cheddar', { displayName: 'Cheddar Cheese' }),
      food('green-apple', 'Apples, green, raw', { displayName: 'Green Apple' }),
      food('chicken-breast', 'Chicken, breast, cooked', { displayName: 'Chicken Breast' }),
      food('mashed-potato', 'Potatoes, mashed', { displayName: 'Mashed Potatoes' }),
      food('unrelated', 'Oatmeal, cooked', { displayName: 'Oatmeal' }),
    ];

    expect(new Set(rankFoodSearchResults(foods, 'rice').slice(0, 2).map(({ id }) => id))).toEqual(
      new Set(['white-rice', 'brown-rice']),
    );
    expect(rankFoodSearchResults(foods, 'milk')[0]?.id).toBe('whole-milk');
    expect(rankFoodSearchResults(foods, 'cheese')[0]?.id).toBe('cheddar');
    expect(rankFoodSearchResults(foods, 'apple')[0]?.id).toBe('green-apple');
    expect(rankFoodSearchResults(foods, 'breast')[0]?.id).toBe('chicken-breast');
    expect(rankFoodSearchResults(foods, 'potato')[0]?.id).toBe('mashed-potato');
  });

  it('matches secondary identity words in aliases and variants', () => {
    const foods = [
      food('chickpea', 'Chickpeas, cooked', {
        displayName: 'Chickpeas',
        searchAliases: ['garbanzo beans'],
      }),
      food('rice', 'Rice, white, cooked', {
        displayName: 'White Rice',
        variantLabel: 'Long Grain · Cooked',
      }),
    ];

    expect(rankFoodSearchResults(foods, 'beans')[0]?.id).toBe('chickpea');
    expect(rankFoodSearchResults(foods, 'cooked')[0]?.id).toBe('rice');
  });

  it('ranks an exact secondary identity word above an unrelated prefix match', () => {
    const ranked = rankFoodSearchResults(
      [
        food('milkfish', 'Fish, milkfish, raw', {
          displayName: 'Milkfish',
          searchPriority: 1,
        }),
        food('whole-milk', 'Milk, whole', {
          displayName: 'Whole Milk',
        }),
      ],
      'milk',
    );

    expect(ranked.map(({ id }) => id)).toEqual(['whole-milk', 'milkfish']);
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

  it('applies specialty-category demotion only in the food-recognition context', () => {
    const general = food('general', 'Banana, raw', {
      displayName: 'Banana',
      category: { id: 'fruit', name: 'Fruits', description: null },
    });
    const specialty = food('specialty', 'Banana, infant food', {
      displayName: 'Banana',
      category: { id: 'baby-food', name: 'Baby Foods', description: null },
    });

    expect(rankFoodSearchResults([general, specialty], 'banana').map(({ id }) => id)).toEqual([
      'specialty',
      'general',
    ]);
    expect(rankFoodSearchResults([general, specialty], 'banana', 'food-recognition').map(({ id }) => id)).toEqual([
      'general',
      'specialty',
    ]);
  });

  it('lets corrected common-food presentation improve both catalog and recognition matching', () => {
    const generalName = 'Carrots, raw';
    const generalPresentation = resolveFoodPresentation(generalName);
    const general = food('general-carrots', generalName, {
      ...generalPresentation,
      category: { id: 'vegetables', name: 'Vegetables', description: null },
    });
    const specialtyName = 'Babyfood, carrots, toddler';
    const specialtyPresentation = resolveFoodPresentation(specialtyName);
    const specialty = food('baby-carrots', specialtyName, {
      ...specialtyPresentation,
      searchPriority: -1,
      category: { id: 'baby-food', name: 'Baby Foods', description: null },
    });

    expect(rankFoodSearchResults([specialty, general], 'carrots').map(({ id }) => id)).toEqual([
      'general-carrots',
      'baby-carrots',
    ]);
    expect(rankFoodSearchResults([specialty, general], 'carrots', 'food-recognition').map(({ id }) => id)).toEqual([
      'general-carrots',
      'baby-carrots',
    ]);
  });

  it('does not let the recognition penalty override an explicitly higher search priority', () => {
    const general = food('general', 'Formula', {
      displayName: 'Formula',
      searchPriority: 0,
      category: { id: 'food', name: 'Food', description: null },
    });
    const specialty = food('specialty', 'Infant Formula', {
      displayName: 'Formula',
      searchPriority: 1,
      category: { id: 'infant', name: 'Infant', description: null },
    });

    expect(rankFoodSearchResults([general, specialty], 'formula', 'food-recognition')[0]?.id).toBe('specialty');
  });

  it('diversifies the initial catalog page while preserving all ranked variants', () => {
    const ranked = [
      food('white-1', 'Rice, white, cooked', {
        displayName: 'White Rice',
      }),
      food('white-2', 'Rice, white, raw', {
        displayName: 'White Rice',
      }),
      food('brown', 'Rice, brown, cooked', {
        displayName: 'Brown Rice',
      }),
      food('wild', 'Wild rice, cooked', {
        displayName: 'Wild Rice',
      }),
      food('brown-2', 'Rice, brown, raw', {
        displayName: 'Brown Rice',
      }),
    ];

    const diversified = diversifyFoodSearchResults(ranked, 3);

    expect(diversified.slice(0, 3).map(({ id }) => id)).toEqual([
      'white-1',
      'brown',
      'wild',
    ]);
    expect(diversified.map(({ id }) => id)).toEqual([
      'white-1',
      'brown',
      'wild',
      'white-2',
      'brown-2',
    ]);
  });
});
