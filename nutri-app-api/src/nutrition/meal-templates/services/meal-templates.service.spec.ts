import { jest } from '@jest/globals';
import { MealTemplateNotFoundError } from '../errors/meal-template-not-found.error.js';
import { MealTemplatesService } from './meal-templates.service.js';

describe('MealTemplatesService', () => {
  it('returns repository-authorized templates', async () => {
    const templates = [{ id: 'template-1', ownerId: 'user-1', visibility: 'PRIVATE', versions: [] }];
    const repository = { findManyVisibleToUser: jest.fn().mockResolvedValue(templates) };
    const service = new MealTemplatesService(repository as never);

    await expect(service.findMany('user-1')).resolves.toEqual(templates);
    expect(repository.findManyVisibleToUser).toHaveBeenCalledWith('user-1');
  });

  it('does not expose unauthorized templates', async () => {
    const repository = { findByIdVisibleToUser: jest.fn().mockResolvedValue(null) };
    const service = new MealTemplatesService(repository as never);

    await expect(service.findById('user-2', 'template-private')).rejects.toBeInstanceOf(MealTemplateNotFoundError);
  });
});
