import { jest } from '@jest/globals';
import { RecipesController } from './recipes.controller.js';

describe('RecipesController', () => {
  it('scopes recipe reads to the authenticated user', async () => {
    const recipe = { id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', createdAt: new Date(), updatedAt: new Date(), versions: [] };
    const service = {
      findMany: jest.fn().mockResolvedValue([recipe]),
      findById: jest.fn().mockResolvedValue(recipe),
    };
    const controller = new RecipesController(service as never, { evaluate: jest.fn() } as never);

    await controller.findMany({ sub: 'user-1', email: 'user@example.com' });
    await controller.findById({ sub: 'user-1', email: 'user@example.com' }, 'recipe-1');

    expect(service.findMany).toHaveBeenCalledWith('user-1');
    expect(service.findById).toHaveBeenCalledWith('user-1', 'recipe-1');
  });
});
