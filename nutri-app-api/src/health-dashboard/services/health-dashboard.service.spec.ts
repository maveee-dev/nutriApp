import { HealthDashboardService } from './health-dashboard.service.js';

function dailyLog() {
  return {
    date: '2026-08-31',
    entries: [{
      id: 'entry-1',
      date: '2026-08-31',
      foodId: 'food-1',
      servingId: 'serving-1',
      servings: '1',
      snapshotFoodName: 'Rice, white',
      snapshotServingName: '1 cup',
      foodName: 'Rice, white',
      displayName: 'White Rice',
      variantLabel: 'Cooked',
      servingName: '1 cup',
      servingGrams: '158',
      nutrients: [],
      createdAt: new Date('2026-08-31T08:00:00.000Z'),
      updatedAt: new Date('2026-08-31T08:00:00.000Z'),
    }],
    totals: {
      calories: { amount: '250', unit: 'kcal' },
      protein: { amount: '5', unit: 'g' },
      sodium: { amount: '100', unit: 'mg' },
    },
    targets: {
      protein: { current: '5', target: '50', remaining: '45', unit: 'g', percentageConsumed: 10, status: 'below-target' },
    },
  };
}

describe('HealthDashboardService', () => {
  it('composes profile, tracker, laboratory, planner, and existing evaluation snapshots', async () => {
    const service = new HealthDashboardService(
      { get: async () => ({ personal: null, conditions: [{ condition: { name: 'Chronic Kidney Disease' } }], dialysis: null, allergies: [], medications: [], nutritionTargets: [] }) } as never,
      { getByDate: async () => dailyLog() } as never,
      { getDailySummary: async () => ({ date: '2026-08-31', mealCount: 1, totals: [], targets: { sodiumMilligrams: '2300', proteinGrams: '50' }, insights: [], deferredPolicies: [] }) } as never,
      { findMany: async () => [{ id: 'report-1', reportDate: new Date('2026-08-30T00:00:00.000Z'), source: 'manual', createdAt: new Date('2026-08-30T01:00:00.000Z'), results: [{ id: 'result-1', reportId: 'report-1', testCode: 'potassium', testName: 'Potassium', value: '5.8', unit: 'mmol/L', referenceLow: '3.5', referenceHigh: '5.1', flag: null, status: 'high', message: 'High', reportDate: new Date('2026-08-30T00:00:00.000Z') }], nutritionInsights: [{ category: 'potassium', severity: 'information', title: 'Potassium information', message: 'Review this result.', evidence: { testCode: 'potassium', value: '5.8', unit: 'mmol/L', status: 'high' } }], ignoredTestCodes: [] }], trends: async () => [] } as never,
      { recommend: async () => ({ date: '2026-08-31', mealType: 'BREAKFAST', focus: 'BALANCED', foods: [], summary: {}, remainingBudget: {}, limitations: [], provenance: { foodSource: 'catalog', selection: 'deterministic', evaluatorVersion: 'v1', policySetFingerprint: null } }) } as never,
      { findForUserDateRange: async () => [{ id: 'snapshot-1', mealItemId: 'meal-item-1', score: 90, coverage: 80, payload: { evaluationStatus: 'evaluated' }, evaluatorVersion: 'v1', policyVersion: 'v1', snapshotVersion: '1', evaluatedAt: new Date('2026-08-31T09:00:00.000Z') }] } as never,
    );

    const result = await service.today('user-1', 'jane.doe@example.com');

    expect(result.greeting.displayName).toBe('Jane Doe');
    expect(result.greeting.profileSummary.conditions).toEqual(['Chronic Kidney Disease']);
    expect(result.nutritionProgress.find((item) => item.nutrient === 'Protein')).toMatchObject({ consumed: '5', target: '50', targetConfigured: true });
    expect(result.dailyFoods[0]).toMatchObject({ foodId: 'food-1', displayName: 'White Rice', compatibilityScore: null });
    expect(result.laboratorySummary.importantResults).toHaveLength(1);
    expect(result.mealPlanner.recommendation?.mealType).toBe('BREAKFAST');
    expect(result.compatibilitySummary).toEqual({ averageScore: 90, evaluated: 1, partiallyEvaluated: 1, insufficientEvidence: 0 });
    expect(result.healthNotices.some((notice) => notice.source === 'laboratory')).toBe(true);
  });

  it('returns an empty, target-aware dashboard without requiring data', async () => {
    const service = new HealthDashboardService(
      { get: async () => ({ personal: null, conditions: [], dialysis: null, allergies: [], medications: [], nutritionTargets: [] }) } as never,
      { getByDate: async () => ({ date: '2026-08-31', entries: [], totals: {}, targets: {} }) } as never,
      { getDailySummary: async () => ({ date: '2026-08-31', mealCount: 0, totals: [], targets: { sodiumMilligrams: '2300', proteinGrams: null }, insights: [], deferredPolicies: [] }) } as never,
      { findMany: async () => [], trends: async () => [] } as never,
      { recommend: async () => null } as never,
      { findForUserDateRange: async () => [] } as never,
    );

    const result = await service.today('user-1');

    expect(result.dailyFoods).toEqual([]);
    expect(result.compatibilitySummary).toEqual({ averageScore: null, evaluated: 0, partiallyEvaluated: 0, insufficientEvidence: 0 });
    expect(result.mealPlanner.recommendation).toBeNull();
    expect(result.nutritionProgress).toHaveLength(6);
    expect(result.nutritionProgress.every((item) => item.targetConfigured === false)).toBe(true);
  });

  it('projects recent, favorite, today, and evaluated recipes when recipe services are available', async () => {
    const updatedAt = new Date('2026-08-31T12:00:00.000Z');
    const service = new HealthDashboardService(
      { get: async () => ({ personal: null, conditions: [], dialysis: null, allergies: [], medications: [], nutritionTargets: [] }) } as never,
      { getByDate: async () => ({ date: '2026-08-31', entries: [{ recipeId: 'recipe-1' }], totals: {}, targets: {} }) } as never,
      { getDailySummary: async () => ({ date: '2026-08-31', mealCount: 0, totals: [], targets: {}, insights: [], deferredPolicies: [] }) } as never,
      { findMany: async () => [], trends: async () => [] } as never,
      { recommend: async () => null } as never,
      { findForUserDateRange: async () => [] } as never,
      { findMany: async () => [{ id: 'recipe-1', isFavorite: true, updatedAt, versions: [{ id: 'recipe-version-1', name: 'Chicken Adobo' }] }] } as never,
      { evaluate: async () => ({ evaluation: { score: 88, coverage: 100 } }) } as never,
    );

    const result = await service.today('user-1');

    expect(result.recipeSummary).toEqual({
      recent: [{ recipeId: 'recipe-1', recipeVersionId: 'recipe-version-1', name: 'Chicken Adobo', isFavorite: true, updatedAt, compatibilityScore: null, coverage: null }],
      favorites: [{ recipeId: 'recipe-1', recipeVersionId: 'recipe-version-1', name: 'Chicken Adobo', isFavorite: true, updatedAt, compatibilityScore: null, coverage: null }],
      today: [{ recipeId: 'recipe-1', recipeVersionId: 'recipe-version-1', name: 'Chicken Adobo', isFavorite: true, updatedAt, compatibilityScore: null, coverage: null }],
      recentEvaluated: [{ recipeId: 'recipe-1', recipeVersionId: 'recipe-version-1', name: 'Chicken Adobo', isFavorite: true, updatedAt, compatibilityScore: 88, coverage: 100 }],
    });
  });
});
