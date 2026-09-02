import { jest } from '@jest/globals';
import { FoodEvaluationService } from './food-evaluation.service.js';
import { NutritionInsightService } from '../../insights/nutrition-insight.service.js';

describe('FoodEvaluationService nutrition insights projection', () => {
  it('adds insights after evaluation without changing the evaluator result', async () => {
    const food = {
      id: 'food-1',
      displayName: 'Ripe Banana',
      name: 'Bananas, raw',
      servings: [{ id: 'serving-1', name: '1 banana', grams: '115' }],
      nutrients: [],
    };
    const evaluation = {
      score: 100,
      evaluationStatus: 'evaluated' as const,
      coverage: 53.33,
      reasons: [],
      contributions: [{ nutrient: 'potassium', unit: 'mg', amount: '375', targetValue: null, currentDailyValue: null, explanation: 'Contribution.' }],
      deferredPolicies: [{ policyId: 'ckd-potassium-v1', reason: 'missing-individualized-potassium-target', explanation: 'Deferred.' }],
    };
    const service = new FoodEvaluationService(
      { findDetailById: jest.fn().mockResolvedValue(food) } as never,
      { calculateForUser: jest.fn().mockResolvedValue({ targets: { sodiumMilligrams: '2300', proteinGrams: null }, deferredPolicies: [] }) } as never,
      { evaluate: jest.fn().mockReturnValue(evaluation) } as never,
      new NutritionInsightService(),
    );

    const result = await service.evaluateWithContext('user-1', 'food-1', 'serving-1', '1');

    expect(result.evaluation).toMatchObject(evaluation);
    expect(result.evaluation.nutritionInsights).toEqual([expect.objectContaining({
      category: 'potassium',
      evidence: expect.objectContaining({ amount: '375', unit: 'mg' }),
    })]);
    expect(result.evaluation.score).toBe(100);
    expect(result.evaluation.coverage).toBe(53.33);
  });
});
