import { DailyTrackerRepository } from './daily-tracker.repository.js';
import { jest } from '@jest/globals';

describe('DailyTrackerRepository', () => {
  it('creates or reuses a day log and stores references plus name snapshots', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'log-1' });
    const create = jest.fn().mockResolvedValue({
      id: 'entry-1',
      dailyLog: { date: new Date('2026-08-30T00:00:00.000Z') },
      foodId: 'food-1',
      servingId: 'serving-1',
      servings: { toString: () => '1.5' },
      snapshotFoodName: 'Rice',
      snapshotServingName: '1 cup',
      food: { name: 'Rice', presentation: null, nutrients: [] },
      serving: { name: '1 cup', grams: { toString: () => '150' } },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repository = new DailyTrackerRepository({
      dailyNutritionLog: { upsert },
      dailyNutritionEntry: { create },
    } as never);

    await repository.createEntry({ userId: 'user-1', date: '2026-08-30', foodId: 'food-1', servingId: 'serving-1', servings: '1.5' }, 'Rice', '1 cup');

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_date: { userId: 'user-1', date: new Date('2026-08-30T00:00:00.000Z') } },
    }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        dailyLogId: 'log-1', foodId: 'food-1', servingId: 'serving-1', snapshotFoodName: 'Rice', snapshotServingName: '1 cup',
      }),
    }));
  });

  it('scopes entry lookup, updates, and deletes to the authenticated user', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const repository = new DailyTrackerRepository({ dailyNutritionEntry: { findFirst, updateMany, deleteMany } } as never);

    await repository.findEntryByIdForUser('entry-1', 'user-1');
    await repository.updateEntry('entry-1', 'user-1', { servings: '2' });
    await repository.deleteEntry('entry-1', 'user-1');

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'entry-1', dailyLog: { userId: 'user-1' } } }));
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'entry-1', dailyLog: { userId: 'user-1' } } }));
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'entry-1', dailyLog: { userId: 'user-1' } } });
  });
});
