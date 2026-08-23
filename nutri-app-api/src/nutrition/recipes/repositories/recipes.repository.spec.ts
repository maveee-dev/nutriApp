import { jest } from '@jest/globals';
import { RecipesRepository } from './recipes.repository.js';

describe('RecipesRepository', () => {
  it('restricts shared recipes to records with an approved version', async () => {
    const prisma = {
      recipe: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new RecipesRepository(prisma as never);

    await repository.findManyVisibleToUser('user-1');

    expect(prisma.recipe.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { ownerId: 'user-1' },
          { visibility: 'SHARED', versions: { some: { approvalStatus: 'APPROVED' } } },
        ],
      },
    }));
  });

  it('scopes a recipe lookup by both ID and visibility ownership', async () => {
    const prisma = { recipe: { findFirst: jest.fn().mockResolvedValue(null) } };
    const repository = new RecipesRepository(prisma as never);

    await repository.findByIdVisibleToUser('user-1', 'recipe-1');

    expect(prisma.recipe.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'recipe-1' }),
    }));
  });
});
