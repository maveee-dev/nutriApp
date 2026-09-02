import { jest } from '@jest/globals';
import { MealPlannerController } from './meal-planner.controller.js';

describe('MealPlannerController', () => {
  it('delegates authenticated recommendation requests to the planner service', async () => {
    const service = {
      recommend: jest.fn().mockResolvedValue({ foods: [], summary: {}, remainingBudget: {}, limitations: [], provenance: {}, date: '2026-08-30', mealType: 'BREAKFAST', focus: 'BALANCED' }),
      getRemainingBudget: jest.fn().mockResolvedValue({ date: '2026-08-30', totals: {}, nutrients: {} }),
    };
    const controller = new MealPlannerController(service as never);
    const user = { sub: 'user-1' } as never;

    await controller.recommendations(user, { date: '2026-08-30' });
    await controller.recommend(user, { mealType: 'LUNCH' });
    await controller.remainingBudget(user, { date: '2026-08-30' });

    expect(service.recommend).toHaveBeenCalledWith('user-1', { date: '2026-08-30' });
    expect(service.recommend).toHaveBeenCalledWith('user-1', { mealType: 'LUNCH' });
    expect(service.getRemainingBudget).toHaveBeenCalledWith('user-1', '2026-08-30');
  });
});
