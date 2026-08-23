import { jest } from '@jest/globals';
import { MealPlanningController } from './meal-planning.controller.js';

describe('MealPlanningController', () => {
  it('scopes the daily meal-plan request to the authenticated user and requested date', async () => {
    const service = { generate: jest.fn().mockResolvedValue({ apiVersion: 'v1', date: '2026-08-20', items: [] }) };
    const controller = new MealPlanningController(service as never);

    await controller.generateDaily({ sub: 'user-1', email: 'user@example.com' }, { date: '2026-08-20' });

    expect(service.generate).toHaveBeenCalledWith('user-1', '2026-08-20');
  });

  it('preserves the service default-date behavior when no date is supplied', async () => {
    const service = { generate: jest.fn().mockResolvedValue({ apiVersion: 'v1', date: '2026-08-20', items: [] }) };
    const controller = new MealPlanningController(service as never);

    await controller.generateDaily({ sub: 'user-1', email: 'user@example.com' }, {});

    expect(service.generate).toHaveBeenCalledWith('user-1', undefined);
  });

  it('scopes slot substitutions to the authenticated user', async () => {
    const service = { customize: jest.fn().mockResolvedValue({}) };
    const controller = new MealPlanningController(service as never);
    const dto = { templateVersionId: 'template-version-1', mealType: 'LUNCH', substitutions: [{ slotId: 'slot-1', recipeVersionId: 'recipe-version-2' }] };

    await controller.customize({ sub: 'user-1', email: 'user@example.com' }, dto);

    expect(service.customize).toHaveBeenCalledWith('user-1', dto);
  });
});
