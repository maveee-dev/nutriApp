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
    const recipesService = { findMany: jest.fn() };
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

  it('returns ambiguity when multiple equally confident foods match', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({
        items: [food('egg-1', 'Egg'), food('egg-2', 'Egg')],
        meta: {},
      }),
    };
    const resolver = new FoodEntityResolver(foodsService as never, { findMany: jest.fn() } as never);

    await expect(resolver.resolve('user-1', 'Can I eat egg?')).resolves.toMatchObject({
      status: 'ambiguous',
      candidates: expect.arrayContaining([
        expect.objectContaining({ foodId: 'egg-1' }),
        expect.objectContaining({ foodId: 'egg-2' }),
      ]),
    });
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
});
