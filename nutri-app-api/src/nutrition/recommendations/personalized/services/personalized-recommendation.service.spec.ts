import { jest } from '@jest/globals';
import { PersonalizedRecommendationService } from './personalized-recommendation.service.js';

function food(id: string, displayName: string, category = 'Food') {
  return {
    id,
    name: `${displayName}, raw`,
    displayName,
    variantLabel: 'Raw',
    category: { id: `category-${category}`, name: category },
    servings: [{ id: `serving-${id}`, name: '1 serving', grams: '100' }],
    nutrients: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function summary(id: string, displayName: string, category = 'Food') {
  return { id, name: `${displayName}, raw`, displayName, variantLabel: 'Raw', category: { id: `category-${category}`, name: category }, planningClass: 'MEAL_ELIGIBLE' as const };
}

function evaluation(score: number, nutrients: readonly { nutrient: string; amount: string; unit: string }[]) {
  return {
    evaluation: {
      score,
      coverage: 100,
      evaluationStatus: 'evaluated' as const,
      reasons: [],
      contributions: nutrients.map((nutrient) => ({ ...nutrient, targetValue: null, currentDailyValue: null, explanation: `${nutrient.nutrient} contribution` })),
      deferredPolicies: [],
      nutritionInsights: [],
    },
    targetCalculation: { targets: {}, adjustments: [], deferredPolicies: [], targetProvenance: [] },
  };
}

function daily() {
  return {
    date: '2026-08-31',
    entries: [],
    totals: { protein: { amount: '20', unit: 'g' }, sodium: { amount: '800', unit: 'mg' } },
    targets: {
      protein: { current: '20', target: '50', remaining: '30', percentageConsumed: 40, unit: 'g', kind: 'LOWER_TARGET' as const, status: 'below-target' as const, rangeMin: null, rangeMax: null, source: 'CLINICIAN', approvalStatus: 'APPROVED' },
      sodium: { current: '800', target: '2300', remaining: '1500', percentageConsumed: 34.78, unit: 'mg', kind: 'UPPER_LIMIT' as const, status: 'within-target' as const, rangeMin: null, rangeMax: null, source: 'SYSTEM', approvalStatus: 'APPROVED' },
    },
  };
}

describe('PersonalizedRecommendationService', () => {
  it('evaluates canonical foods, excludes allergies, and ranks by the requested goal', async () => {
    const highProtein = food('food-protein', 'Chicken Breast', 'Protein');
    const lowProtein = food('food-low', 'Apple', 'Fruit');
    const summaries = [summary(highProtein.id, highProtein.displayName, 'Protein'), summary(lowProtein.id, lowProtein.displayName, 'Fruit'), summary('food-milk', 'Milk', 'Dairy')];
    const evaluationService = {
      loadEvaluationContext: jest.fn().mockResolvedValue({ conditionCodes: ['ckd'], evidence: {}, profile: null, energyGoal: 'maintenance', asOf: new Date('2026-08-31T00:00:00.000Z') }),
      evaluateWithContext: jest.fn().mockImplementation(async (_userId: string, id: string) => id === highProtein.id ? evaluation(92, [{ nutrient: 'protein', amount: '30', unit: 'g' }, { nutrient: 'sodium', amount: '120', unit: 'mg' }]) : evaluation(95, [{ nutrient: 'protein', amount: '2', unit: 'g' }, { nutrient: 'sodium', amount: '10', unit: 'mg' }])),
      getPolicySetFingerprint: jest.fn().mockReturnValue('policy-fingerprint'),
    };
    const foodsService = {
      findAllForPlanning: jest.fn().mockResolvedValue(summaries),
      findDetailById: jest.fn().mockImplementation(async (id: string) => id === highProtein.id ? highProtein : id === lowProtein.id ? lowProtein : food('food-milk', 'Milk', 'Dairy')),
    };
    const service = new PersonalizedRecommendationService(
      { get: jest.fn().mockResolvedValue({ personal: null, conditions: [{ condition: { name: 'CKD' } }], dialysis: null, allergies: [{ name: 'Milk' }], medications: [], nutritionTargets: [] }) } as never,
      { getByDate: jest.fn().mockResolvedValue(daily()) } as never,
      { latest: jest.fn().mockResolvedValue({ results: [], nutritionInsights: [] }), trends: jest.fn().mockResolvedValue([]) } as never,
      { active: jest.fn().mockResolvedValue([{ id: 'target-1' }]) } as never,
      foodsService as never,
      evaluationService as never,
      { generate: jest.fn().mockReturnValue([]) } as never,
    );

    const result = await service.recommend('user-1', { goal: 'higher-protein', date: '2026-08-31', limit: 2 });

    expect(result.recommendations.map(({ foodId }) => foodId)).toEqual([highProtein.id, lowProtein.id]);
    expect(result.recommendations.some(({ foodId }) => foodId === 'food-milk')).toBe(false);
    expect(evaluationService.evaluateWithContext).toHaveBeenCalledTimes(2);
    expect(result.provenance).toMatchObject({ policySetFingerprint: 'policy-fingerprint', activeTargetIds: ['target-1'] });
    expect(result.profileConsiderations[0]).toContain('CKD');
  });

  it('does not infer a missing lower potassium target', async () => {
    const banana = food('food-banana', 'Banana');
    const service = new PersonalizedRecommendationService(
      { get: jest.fn().mockResolvedValue({ personal: null, conditions: [], dialysis: null, allergies: [], medications: [], nutritionTargets: [] }) } as never,
      { getByDate: jest.fn().mockResolvedValue({ ...daily(), targets: {} }) } as never,
      { latest: jest.fn().mockResolvedValue({ results: [], nutritionInsights: [] }), trends: jest.fn().mockResolvedValue([]) } as never,
      { active: jest.fn().mockResolvedValue([]) } as never,
      { findAllForPlanning: jest.fn().mockResolvedValue([summary(banana.id, banana.displayName)]), findDetailById: jest.fn().mockResolvedValue(banana) } as never,
      { loadEvaluationContext: jest.fn().mockResolvedValue({ conditionCodes: [], evidence: {}, profile: null, energyGoal: 'maintenance', asOf: new Date() }), evaluateWithContext: jest.fn().mockResolvedValue(evaluation(100, [{ nutrient: 'potassium', amount: '375', unit: 'mg' }])), getPolicySetFingerprint: jest.fn().mockReturnValue(null) } as never,
      { generate: jest.fn().mockReturnValue([]) } as never,
    );

    const result = await service.recommend('user-1', { goal: 'lower-potassium' });

    expect(result.recommendations[0]?.remainingBudgetImpact[0]).toMatchObject({ nutrient: 'potassium', targetConfigured: false, remainingAfter: null });
    expect(result.limitations).toContain('No personalized potassium target is configured; results are comparative and do not establish a personal limit.');
  });
});
