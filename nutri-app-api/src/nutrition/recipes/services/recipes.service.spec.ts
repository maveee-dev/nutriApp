import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { RecipesService } from './recipes.service.js';

describe('RecipesService', () => {
  it('validates a recipe and delegates persistence without copying nutrients', async () => {
    const createOwned = jest.fn().mockResolvedValue({ id: 'recipe-1' });
    const service = new RecipesService({ createOwned } as never);

    await service.create('user-1', {
      name: 'Chicken Bowl',
      servings: '2',
      ingredients: [{ foodId: 'food-1', servingId: 'serving-1', quantity: '1', unit: 'SERVING', role: 'INGREDIENT' }],
    });

    expect(createOwned).toHaveBeenCalledWith('user-1', expect.objectContaining({
      name: 'Chicken Bowl', servings: '2', ingredients: [expect.objectContaining({ foodId: 'food-1', servingId: 'serving-1' })],
    }));
  });

  it('rejects empty recipes and non-positive quantities', async () => {
    const service = new RecipesService({} as never);

    await expect(service.create('user-1', { name: 'Empty', servings: '1', ingredients: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('user-1', { name: 'Invalid', servings: '1', ingredients: [{ foodId: 'food-1', quantity: '0', unit: 'GRAM', role: 'INGREDIENT' }] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
