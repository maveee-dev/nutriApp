import { NutritionAnalysisRepository } from '../repositories/nutrition-analysis.repository.js';
import { NutritionAnalysisService } from './nutrition-analysis.service.js';
import { NutritionCalculator } from './nutrition-calculator.js';
import { NutritionInsightEngine } from './nutrition-insight-engine.js';
import { NutritionTargetCalculator } from './nutrition-target-calculator.js';

describe('NutritionAnalysisService', () => {
  it('loads one UTC day and calculates its summary', async () => {
    const repository = {
      findMealsForDateRange: async (_userId: string, start: Date, end: Date) => {
        expect(start.toISOString()).toBe('2026-08-12T00:00:00.000Z');
        expect(end.toISOString()).toBe('2026-08-13T00:00:00.000Z');
        return [{
          id: 'meal-1',
          consumedAt: start,
          items: [{
            quantity: '2',
            servingGrams: '50',
            nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10' }],
          }],
        }];
      },
    } satisfies Pick<NutritionAnalysisRepository, 'findMealsForDateRange'>;
    const profilesRepository = { getMyProfile: async () => null };

    const service = new NutritionAnalysisService(
      repository as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      profilesRepository as any,
      { findUserConditions: async () => [] } as any,
      new NutritionInsightEngine(),
      new NutritionTargetCalculator(),
      { findLatestEgfr: async () => null } as any,
      { findByUserId: async () => null } as any,
    );

    await expect(service.getDailySummary('user-1', '2026-08-12')).resolves.toEqual({
      date: '2026-08-12',
      mealCount: 1,
      totals: [{ name: 'Protein', unit: 'g', amount: '10' }],
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      insights: [],
      deferredPolicies: [],
    });
  });

  it('builds a seven-day summary from one meal query and shared target context', async () => {
    const repository = {
      findMealsForDateRange: async (_userId: string, start: Date, end: Date) => {
        expect(start.toISOString()).toBe('2026-08-10T00:00:00.000Z');
        expect(end.toISOString()).toBe('2026-08-17T00:00:00.000Z');
        return [{
          id: 'meal-1',
          consumedAt: new Date('2026-08-12T12:00:00.000Z'),
          items: [{
            quantity: '1',
            servingGrams: '100',
            nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10' }],
          }],
        }];
      },
    } satisfies Pick<NutritionAnalysisRepository, 'findMealsForDateRange'>;
    const service = new NutritionAnalysisService(
      repository as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      { getMyProfile: async () => null } as any,
      { findUserConditions: async () => [] } as any,
      new NutritionInsightEngine(),
      new NutritionTargetCalculator(),
      { findLatestEgfr: async () => null } as any,
      { findByUserId: async () => null } as any,
    );

    const summary = await service.getWeeklySummary('user-1', '2026-08-10');

    expect(summary.startDate).toBe('2026-08-10');
    expect(summary.endDate).toBe('2026-08-16');
    expect(summary.days).toHaveLength(7);
    expect(summary.days[2]).toMatchObject({
      date: '2026-08-12',
      mealCount: 1,
      totals: [{ name: 'Protein', unit: 'g', amount: '10' }],
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      deferredPolicies: [],
    });
    expect(summary.days[0]).toMatchObject({ date: '2026-08-10', mealCount: 0, totals: [] });
  });
});
