import { jest } from '@jest/globals';
import { FoodEntityResolver } from './food-entity-resolver.js';

function food(
  id: string,
  displayName: string,
  options: { name?: string; aliases?: readonly string[] } = {},
) {
  return {
    id,
    name: options.name ?? displayName,
    displayName,
    variantLabel: null,
    searchAliases: options.aliases ?? [],
    category: { id: 'category-1', name: 'Food', description: null },
  };
}

describe('FoodEntityResolver', () => {
  it('resolves one exact presentation match from conversational text', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [food('food-1', 'Chicken Adobo')], meta: {} }),
    };
    const recipesService = { findMany: jest.fn().mockResolvedValue([]) };
    const resolver = new FoodEntityResolver(foodsService as never, recipesService as never);

    await expect(resolver.resolve('user-1', 'Can I eat chicken adobo?')).resolves.toMatchObject({
      status: 'resolved',
      candidates: [{ kind: 'food', foodId: 'food-1', displayName: 'Chicken Adobo', confidence: 'high', matchType: 'display-exact' }],
    });
    expect(foodsService.findMany).toHaveBeenCalledWith(expect.objectContaining({ search: 'chicken adobo' }));
    expect(recipesService.findMany).not.toHaveBeenCalled();
  });

  it('uses aliases through the existing food search result contract', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [food('food-1', 'Garbanzo Bean', { aliases: ['chickpeas'] })], meta: {} }),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    await expect(resolver.resolve('user-1', 'Are chickpeas healthy?')).resolves.toMatchObject({
      status: 'resolved',
      candidates: [{ foodId: 'food-1', matchType: 'alias-exact', confidence: 'high' }],
    });
  });

  it('normalizes common Filipino food phrasing before using the existing search service', async () => {
    const foodsService = {
      findMany: jest.fn(async (input: { search?: string }) => ({
        items: input.search === 'chicken adobo' ? [food('food-1', 'Chicken Adobo')] : [],
        meta: {},
      })),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    await expect(resolver.resolve('user-1', 'Pwede ba kainin ang adobong manok?')).resolves.toMatchObject({
      status: 'resolved',
      candidates: [{ foodId: 'food-1', stableId: 'food-1', matchType: 'display-exact', confidence: 'high' }],
    });
    expect(foodsService.findMany).toHaveBeenCalledWith(expect.objectContaining({ search: 'chicken adobo' }));
  });

  it('resolves a unique bounded typo correction without invoking recipes', async () => {
    const foodsService = {
      findMany: jest.fn(async (input: { search?: string }) => ({
        items: input.search === 'banana' ? [food('food-1', 'Banana')] : [],
        meta: {},
      })),
    };
    const recipesService = { findMany: jest.fn().mockResolvedValue([]) };
    const resolver = new FoodEntityResolver(foodsService as never, recipesService as never);

    await expect(resolver.resolve('user-1', 'Can I eat bananna?')).resolves.toMatchObject({
      status: 'resolved',
      candidates: [{ foodId: 'food-1', matchType: 'fuzzy', confidence: 'high' }],
    });
    expect(recipesService.findMany).not.toHaveBeenCalled();
  });

  it('returns ambiguity when multiple equally confident foods match', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({
        items: [food('egg-1', 'Egg'), food('egg-2', 'Egg')],
        meta: {},
      }),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    const result = await resolver.resolve('user-1', 'Can I eat egg?');
    expect(result).toMatchObject({
      status: 'ambiguous',
      candidates: expect.arrayContaining([
        expect.objectContaining({ foodId: 'egg-1' }),
        expect.objectContaining({ foodId: 'egg-2' }),
      ]),
    });
    expect(result.clarification?.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({ stableId: 'egg-1', kind: 'food' }),
      expect.objectContaining({ stableId: 'egg-2', kind: 'food' }),
    ]));
  });

  it('keeps both exact comparison entities instead of resolving the first one', async () => {
    const foodsService = {
      findMany: jest.fn(async (input: { search?: string }) => ({
        items: input.search === 'tilapia'
          ? [food('tilapia-1', 'Tilapia')]
          : input.search === 'bangus'
            ? [food('bangus-1', 'Bangus')]
            : [],
        meta: {},
      })),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    await expect(resolver.resolve('user-1', 'Between tilapia and bangus, which is healthier?')).resolves.toMatchObject({
      status: 'ambiguous',
      candidates: expect.arrayContaining([
        expect.objectContaining({ foodId: 'tilapia-1' }),
        expect.objectContaining({ foodId: 'bangus-1' }),
      ]),
    });
  });

  it('returns not-found when only a weak single prefix match exists', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [food('food-1', 'Chicken Bread')], meta: {} }),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    await expect(resolver.resolve('user-1', 'Can I eat chicken?')).resolves.toMatchObject({
      status: 'not-found',
      candidates: [{ foodId: 'food-1', confidence: 'medium' }],
    });
  });

  it('uses an exact approved recipe name only when no food match exists', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    };
    const recipesService = {
      findMany: jest.fn().mockResolvedValue([{
        id: 'recipe-1',
        versions: [{ id: 'recipe-version-1', name: 'Chicken Adobo', approvalStatus: 'APPROVED', cuisine: 'Filipino' }],
      }]),
    };
    const resolver = new FoodEntityResolver(foodsService as never, recipesService as never);

    await expect(resolver.resolve('user-1', 'Tell me about chicken adobo')).resolves.toMatchObject({
      status: 'resolved',
      candidates: [{ kind: 'approved-recipe', recipeId: 'recipe-1', recipeVersionId: 'recipe-version-1', matchType: 'recipe-exact' }],
    });
  });

  it('does not search recipes when the food catalog already has candidates', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [food('food-1', 'Apple')], meta: {} }),
    };
    const recipesService = { findMany: jest.fn() };
    const resolver = new FoodEntityResolver(foodsService as never, recipesService as never);

    await resolver.resolve('user-1', 'Can I eat apple?');

    expect(recipesService.findMany).not.toHaveBeenCalled();
  });

  it('prefers the current private recipe for an explicit personal-recipe question', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [food('food-1', 'Chicken Adobo')], meta: {} }),
    };
    const recipesService = {
      findMany: jest.fn().mockResolvedValue([{
        id: 'recipe-1',
        versions: [
          { id: 'recipe-version-2', version: 2, name: 'Chicken Adobo', approvalStatus: 'APPROVED', cuisine: 'Filipino' },
          { id: 'recipe-version-1', version: 1, name: 'Chicken Adobo', approvalStatus: 'APPROVED', cuisine: 'Filipino' },
        ],
      }]),
    };
    const resolver = new FoodEntityResolver(foodsService as never, recipesService as never);

    await expect(resolver.resolve('user-1', 'Can I eat my chicken adobo recipe?')).resolves.toMatchObject({
      status: 'resolved',
      candidates: [{ kind: 'approved-recipe', recipeId: 'recipe-1', recipeVersionId: 'recipe-version-2' }],
    });
  });

  it('returns duplicate personal recipes as stable, distinguishable clarification choices', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    };
    const recipesService = {
      findOwnedByUser: jest.fn().mockResolvedValue([
        {
          id: 'recipe-1',
          ownerId: 'user-1',
          versions: [{
            id: 'version-1', version: 1, name: 'Chicken Adobo', approvalStatus: 'APPROVED', yieldServings: '4', cuisine: null,
            components: [{ foodDisplayName: 'Chicken Breast' }, { foodDisplayName: 'Soy Sauce' }],
          }],
        },
        {
          id: 'recipe-2',
          ownerId: 'user-1',
          versions: [{
            id: 'version-2', version: 1, name: 'Chicken Adobo', approvalStatus: 'APPROVED', yieldServings: '6', cuisine: null,
            components: [{ foodDisplayName: 'Chicken Thigh' }, { foodDisplayName: 'Coconut Milk' }],
          }],
        },
      ]),
      findMany: jest.fn(),
    };
    const resolver = new FoodEntityResolver(foodsService as never, recipesService as never);

    const result = await resolver.resolve('user-1', 'Can I eat my Chicken Adobo?');

    expect(result.status).toBe('ambiguous');
    expect(recipesService.findOwnedByUser).toHaveBeenCalledWith('user-1');
    expect(result.clarification?.choices).toEqual([
      expect.objectContaining({ stableId: 'version-1', recipeId: 'recipe-1', recipeYieldServings: '4', recipeIngredientNames: ['Chicken Breast', 'Soy Sauce'] }),
      expect.objectContaining({ stableId: 'version-2', recipeId: 'recipe-2', recipeYieldServings: '6', recipeIngredientNames: ['Chicken Thigh', 'Coconut Milk'] }),
    ]);
  });

  it('uses the recognition-only ranking context for image labels', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [food('food-1', 'Banana')], meta: {} }),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    await resolver.resolveFoodLabel('banana');

    expect(foodsService.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'banana' }),
      'food-recognition',
    );
  });

  it('resolves a specific recognition label against canonical tokens after catalog ranking', async () => {
    const foodsService = {
      findMany: jest.fn(async (input: { search?: string }) => ({
        items: input.search === 'white rice'
          ? [
              food('rice-cooked', 'White Rice', { name: 'Rice, white, cooked' }),
              food('rice-raw', 'White Rice', { name: 'Rice, white, raw' }),
            ]
          : [],
        meta: {},
      })),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    await expect(resolver.resolveFoodLabel('Cooked White Rice')).resolves.toMatchObject({
      status: 'resolved',
      candidates: [{
        foodId: 'rice-cooked',
        displayName: 'White Rice',
        confidence: 'high',
        matchType: 'display-exact',
      }],
    });
  });

  it('uses the full recognition label before falling back to broader food phrases', async () => {
    const foodsService = {
      findMany: jest.fn(async (input: { search?: string }) => ({
        items: input.search === 'cooked white rice'
          ? [food('rice-cooked', 'Rice', { name: 'Rice, white, cooked' })]
          : input.search === 'white rice'
            ? [food('rice-raw', 'White Rice', { name: 'Rice, white, raw' })]
            : [],
        meta: {},
      })),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    await expect(resolver.resolveFoodLabel('Cooked White Rice')).resolves.toMatchObject({
      status: 'resolved',
      candidates: [{
        foodId: 'rice-cooked',
        matchType: 'canonical-token-match',
        confidence: 'high',
      }],
    });
  });
});
