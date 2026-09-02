import { jest } from '@jest/globals';
import { MealPlannerRepository } from './meal-planner.repository.js';

describe('MealPlannerRepository', () => {
  it('discovers the canonical catalog through FoodsService and returns stable ordering', async () => {
    const foodsService = {
      findAllForPlanning: jest.fn().mockResolvedValue([
        { id: 'b', name: 'B canonical', displayName: 'Beta', category: { id: 'category', name: 'Foods', description: null } },
        { id: 'a', name: 'A canonical', displayName: 'Alpha', category: { id: 'category', name: 'Foods', description: null } },
      ]),
      findDetailById: jest.fn(),
    };
    const repository = new MealPlannerRepository(foodsService as never);

    const result = await repository.findCandidateFoods();

    expect(result.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(foodsService.findAllForPlanning).toHaveBeenCalledTimes(1);
  });
});
