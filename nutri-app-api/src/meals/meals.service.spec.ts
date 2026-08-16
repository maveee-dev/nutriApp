import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { MealsService } from './services/meals.service.js';
import { MealsRepository } from './repositories/meals.repository.js';
import { MealNotFoundError } from './errors/meal-not-found.error.js';

describe('MealsService', () => {
  let service: MealsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
        { provide: MealsRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<MealsService>(MealsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not return a meal owned by another user', async () => {
    const findDetailById = jest.fn<MealsRepository['findDetailById']>();
    findDetailById.mockResolvedValue(null);
    const repository: Pick<MealsRepository, 'findDetailById'> = {
      findDetailById,
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
        { provide: MealsRepository, useValue: repository },
      ],
    }).compile();

    const scopedService = module.get<MealsService>(MealsService);

    await expect(scopedService.findDetailById('meal-id', 'other-user-id'))
      .rejects.toBeInstanceOf(MealNotFoundError);
    expect(repository.findDetailById).toHaveBeenCalledWith(
      'meal-id',
      'other-user-id',
    );
  });

  it('does not delete a meal owned by another user', async () => {
    const deleteMeal = jest.fn<MealsRepository['delete']>();
    deleteMeal.mockRejectedValue(new MealNotFoundError());
    const repository: Pick<MealsRepository, 'delete'> = {
      delete: deleteMeal,
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
        { provide: MealsRepository, useValue: repository },
      ],
    }).compile();

    const scopedService = module.get<MealsService>(MealsService);

    await expect(scopedService.delete('meal-id', 'other-user-id'))
      .rejects.toBeInstanceOf(MealNotFoundError);
    expect(repository.delete).toHaveBeenCalledWith('meal-id', 'other-user-id');
  });
});
