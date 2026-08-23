import { jest } from '@jest/globals';
import { MealTemplatesController } from './meal-templates.controller.js';

describe('MealTemplatesController', () => {
  it('scopes template reads to the authenticated user', async () => {
    const template = { id: 'template-1', ownerId: 'user-1', visibility: 'PRIVATE', createdAt: new Date(), updatedAt: new Date(), versions: [] };
    const service = { findMany: jest.fn().mockResolvedValue([template]), findById: jest.fn().mockResolvedValue(template) };
    const controller = new MealTemplatesController(service as never);

    await controller.findMany({ sub: 'user-1', email: 'user@example.com' });
    await controller.findById({ sub: 'user-1', email: 'user@example.com' }, 'template-1');

    expect(service.findMany).toHaveBeenCalledWith('user-1');
    expect(service.findById).toHaveBeenCalledWith('user-1', 'template-1');
  });
});
