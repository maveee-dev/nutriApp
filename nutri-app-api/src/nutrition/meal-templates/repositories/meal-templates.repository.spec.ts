import { jest } from '@jest/globals';
import { MealTemplatesRepository } from './meal-templates.repository.js';

describe('MealTemplatesRepository', () => {
  it('requires shared templates to contain an approved version', async () => {
    const prisma = { mealTemplate: { findMany: jest.fn().mockResolvedValue([]) } };
    const repository = new MealTemplatesRepository(prisma as never);

    await repository.findManyVisibleToUser('user-1');

    expect(prisma.mealTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ ownerId: 'user-1' }, { visibility: 'SHARED', versions: { some: { approvalStatus: 'APPROVED' } } }] },
    }));
  });
});
