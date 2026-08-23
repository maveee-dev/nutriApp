import { jest } from '@jest/globals';
import { RecipeNotFoundError } from '../errors/recipe-not-found.error.js';
import { RecipesService } from './recipes.service.js';

describe('RecipesService', () => {
  it('returns only the recipes supplied by the visibility-aware repository', async () => {
    const recipes = [{ id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', versions: [] }];
    const repository = { findManyVisibleToUser: jest.fn().mockResolvedValue(recipes) };
    const service = new RecipesService(repository as never);

    await expect(service.findMany('user-1')).resolves.toEqual(recipes);
    expect(repository.findManyVisibleToUser).toHaveBeenCalledWith('user-1');
  });

  it('does not expose a recipe that the repository cannot authorize', async () => {
    const repository = { findByIdVisibleToUser: jest.fn().mockResolvedValue(null) };
    const service = new RecipesService(repository as never);

    await expect(service.findById('user-2', 'recipe-private')).rejects.toBeInstanceOf(RecipeNotFoundError);
    expect(repository.findByIdVisibleToUser).toHaveBeenCalledWith('user-2', 'recipe-private');
  });
});
