import { DailyTrackerController } from './daily-tracker.controller.js';
import { jest } from '@jest/globals';

describe('DailyTrackerController', () => {
  it('passes the authenticated user and request data to the tracker service', async () => {
    const service = {
      createEntry: jest.fn().mockResolvedValue({ date: '2026-08-30', entries: [], totals: {}, targets: {} }),
    };
    const controller = new DailyTrackerController(service as never);

    await expect(controller.create({ sub: 'user-1' } as never, {
      date: '2026-08-30', foodId: 'food-1', servingId: 'serving-1', servings: '1.25',
    })).resolves.toMatchObject({ date: '2026-08-30' });
    expect(service.createEntry).toHaveBeenCalledWith({
      userId: 'user-1', date: '2026-08-30', foodId: 'food-1', servingId: 'serving-1', servings: '1.25',
    });
  });

  it('uses the no-date request as today for creation', async () => {
    const service = { createEntry: jest.fn().mockResolvedValue({ date: new Date().toISOString().slice(0, 10), entries: [], totals: {}, targets: {} }) };
    const controller = new DailyTrackerController(service as never);
    await controller.create({ sub: 'user-1' } as never, { foodId: 'food-1', servingId: 'serving-1', servings: '1' } as never);
    expect(service.createEntry.mock.calls[0][0].date).toBe(new Date().toISOString().slice(0, 10));
  });
});
