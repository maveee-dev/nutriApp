import { DailyTrackerService } from './daily-tracker.service.js';
import { jest } from '@jest/globals';

const entry = (overrides: Partial<{
  id: string;
  date: string;
  foodId: string;
  servingId: string;
  servings: string;
  servingGrams: string;
  nutrients: { sourceId?: string | null; name: string; unit: string; amountPer100Grams: string }[];
}> = {}) => ({
  id: 'entry-1',
  date: '2026-08-30',
  foodId: 'food-1',
  servingId: 'serving-1',
  servings: '1',
  snapshotFoodName: 'Rice',
  snapshotServingName: '1 cup',
  foodName: 'Rice',
  displayName: 'Rice',
  variantLabel: 'Cooked',
  servingName: '1 cup',
  servingGrams: '150',
  nutrients: [
    { name: 'Protein', unit: 'g', amountPer100Grams: '2.5' },
    { name: 'Total lipid (fat)', unit: 'g', amountPer100Grams: '10' },
    { name: 'Sodium, Na', unit: 'mg', amountPer100Grams: '10' },
  ],
  createdAt: new Date('2026-08-30T08:00:00.000Z'),
  updatedAt: new Date('2026-08-30T08:00:00.000Z'),
  ...overrides,
});

describe('DailyTrackerService', () => {
  it('aggregates portions through the existing NutritionCalculator and compares active targets', async () => {
    const first = entry({ id: 'entry-1', servings: '1.5', servingGrams: '120' });
    const second = entry({ id: 'entry-2', servings: '0.5', servingGrams: '80', nutrients: [
      { name: 'Protein', unit: 'g', amountPer100Grams: '5' },
      { name: 'Sodium, Na', unit: 'mg', amountPer100Grams: '20' },
    ] });
    const repository = {
      findByUserAndDate: async () => ({ date: '2026-08-30', entries: [first, second], totals: {}, targets: {} }),
    };
    const targetService = {
      active: async () => [
        { nutrient: 'proteinGrams', value: '50', unit: 'g/day', kind: 'LOWER_TARGET', source: 'USER', approvalStatus: 'APPROVED', rangeMin: null, rangeMax: null },
        { nutrient: 'sodiumMilligrams', value: '2300', unit: 'mg/day', kind: 'UPPER_LIMIT', source: 'CLINICIAN', approvalStatus: 'APPROVED', rangeMin: null, rangeMax: null },
      ],
    };
    const service = new DailyTrackerService(repository as never, targetService as never);

    await expect(service.getByDate('user-1', '2026-08-30')).resolves.toMatchObject({
      date: '2026-08-30',
      totals: {
        protein: { amount: '6.5', unit: 'g' },
        fat: { amount: '18', unit: 'g' },
        sodium: { amount: '26', unit: 'mg' },
      },
      targets: {
        protein: { current: '6.5', target: '50', remaining: '43.5', percentageConsumed: 13, status: 'below-target', unit: 'g' },
        sodium: { current: '26', target: '2300', remaining: '2274', percentageConsumed: 1.13, status: 'within-target', unit: 'mg' },
      },
    });
  });

  it('preserves missing nutrient evidence instead of converting it to a contribution', async () => {
    const repository = {
      findByUserAndDate: async () => ({ date: '2026-08-30', entries: [entry({ nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '2.5' }] })], totals: {}, targets: {} }),
    };
    const service = new DailyTrackerService(repository as never, { active: async () => [] } as never);

    await expect(service.getByDate('user-1', '2026-08-30')).resolves.toMatchObject({
      totals: { protein: { amount: '3.75', unit: 'g' } },
      targets: {},
    });
  });

  it('returns zero intake for an empty day while leaving unconfigured targets absent', async () => {
    const service = new DailyTrackerService(
      { findByUserAndDate: async () => null } as never,
      { active: async () => [] } as never,
    );

    await expect(service.getByDate('user-1', '2026-08-30')).resolves.toEqual({
      date: '2026-08-30',
      entries: [],
      totals: {},
      targets: {},
    });
  });

  it('creates an entry using the selected canonical serving and returns the refreshed day', async () => {
    const createEntry = jest.fn().mockResolvedValue(undefined);
    const repository = {
      findServingForFood: jest.fn().mockResolvedValue({ food: { name: 'Egg' }, name: '1 egg' }),
      createEntry,
      findByUserAndDate: async () => ({ date: '2026-08-30', entries: [entry({ foodId: 'food-egg', servingId: 'serving-egg' })], totals: {}, targets: {} }),
    };
    const service = new DailyTrackerService(repository as never, { active: async () => [] } as never);

    await service.createEntry({ userId: 'user-1', date: '2026-08-30', foodId: 'food-egg', servingId: 'serving-egg', servings: '1.25' });

    expect(createEntry).toHaveBeenCalledWith(
      { userId: 'user-1', date: '2026-08-30', foodId: 'food-egg', servingId: 'serving-egg', servings: '1.25' },
      'Egg',
      '1 egg',
    );
  });

  it('routes recipe entries through the recipe-specific tracker path', async () => {
    const service = new DailyTrackerService({} as never, { active: async () => [] } as never);
    const createRecipeEntry = jest.spyOn(service, 'createRecipeEntry').mockResolvedValue({
      date: '2026-08-30', entries: [], totals: {}, targets: {},
    });

    await service.createEntry({
      userId: 'user-1', date: '2026-08-30', recipeId: 'recipe-1', recipeVersionId: 'version-1', servings: '1',
    });

    expect(createRecipeEntry).toHaveBeenCalledWith({
      userId: 'user-1', date: '2026-08-30', recipeId: 'recipe-1', recipeVersionId: 'version-1', servings: '1',
    });
  });

  it('updates and deletes entries in their historical day', async () => {
    const updated = jest.fn().mockResolvedValue(entry({ servings: '2' }));
    const deleted = jest.fn().mockResolvedValue(true);
    const repository = {
      findEntryByIdForUser: async () => entry({ date: '2026-08-29' }),
      updateEntry: updated,
      deleteEntry: deleted,
      findByUserAndDate: async (_userId: string, date: Date) => ({ date: date.toISOString().slice(0, 10), entries: [entry({ date: '2026-08-29', servings: '2' })], totals: {}, targets: {} }),
    };
    const service = new DailyTrackerService(repository as never, { active: async () => [] } as never);

    await service.updateEntry('user-1', 'entry-1', { servings: '2' });
    await service.deleteEntry('user-1', 'entry-1');

    expect(updated).toHaveBeenCalledWith('entry-1', 'user-1', { servings: '2' });
    expect(deleted).toHaveBeenCalledWith('entry-1', 'user-1');
  });

  it('rejects invalid dates and non-positive portions', async () => {
    const service = new DailyTrackerService({} as never, { active: async () => [] } as never);
    await expect(service.getByDate('user-1', '2026-02-30')).rejects.toThrow('valid calendar date');
    await expect(service.createEntry({ userId: 'user-1', date: '2026-08-30', foodId: 'food-1', servingId: 'serving-1', servings: '0' })).rejects.toThrow('positive number');
  });
});
