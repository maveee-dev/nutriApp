import { jest } from '@jest/globals';
import { FoodEvaluationConsultationService } from './food-evaluation-consultation.service.js';

describe('FoodEvaluationConsultationService', () => {
  const resolution = {
    status: 'resolved' as const,
    query: 'Can I eat egg?',
    candidates: [{
      kind: 'food' as const,
      foodId: 'food-egg',
      displayName: 'Egg',
      variantLabel: 'Large',
      matchType: 'display-exact' as const,
      confidence: 'high' as const,
    }],
  };

  it('uses the existing preferred serving and delegates evaluation to FoodEvaluationService', async () => {
    const foodsService = {
      findDetailById: jest.fn().mockResolvedValue({
        id: 'food-egg',
        displayName: 'Egg',
        variantLabel: 'Large',
        servings: [
          { id: 'serving-100g', name: '100 g', grams: '100' },
          { id: 'serving-large-egg', name: '1 large egg', grams: '50' },
        ],
      }),
    };
    const evaluationService = {
      evaluateWithContext: jest.fn().mockResolvedValue({
        evaluation: {
          score: 100,
          evaluationStatus: 'evaluated',
          coverage: 100,
          reasons: [],
          contributions: [{ nutrient: 'protein', unit: 'g', amount: '6', targetValue: '60', currentDailyValue: null, explanation: 'Provides protein.' }],
          deferredPolicies: [],
        },
        targetCalculation: {
          targets: { sodiumMilligrams: '2300', proteinGrams: '60' },
          adjustments: [],
          deferredPolicies: [],
          targetProvenance: [{ policyId: 'general-sodium-v1', source: 'guideline', version: 'v1', explanation: 'Sodium target.' }],
        },
      }),
      getPolicySetFingerprint: jest.fn().mockReturnValue('policy-set-1'),
    };
    const service = new FoodEvaluationConsultationService(foodsService as never, evaluationService as never);

    const result = await service.evaluate('user-1', resolution);

    expect(foodsService.findDetailById).toHaveBeenCalledWith('food-egg');
    expect(evaluationService.evaluateWithContext).toHaveBeenCalledWith('user-1', 'food-egg', 'serving-large-egg', '1');
    expect(result).toMatchObject({
      foodId: 'food-egg',
      displayName: 'Egg',
      serving: { id: 'serving-large-egg', grams: '50', quantity: '1' },
      evaluation: { score: 100, coverage: 100 },
      policySetFingerprint: 'policy-set-1',
    });
    expect(result?.targetCalculation.targetProvenance?.[0].policyId).toBe('general-sodium-v1');
  });

  it.each([
    { status: 'ambiguous' as const, candidates: [] },
    { status: 'not-found' as const, candidates: [] },
    { status: 'resolved' as const, candidates: [{ ...resolution.candidates[0], kind: 'approved-recipe' as const, foodId: undefined, recipeId: 'recipe-1' }] },
  ])('does not evaluate a non-confident or non-food entity (%s)', async (input) => {
    const foodsService = { findDetailById: jest.fn() };
    const evaluationService = { evaluateWithContext: jest.fn(), getPolicySetFingerprint: jest.fn() };
    const service = new FoodEvaluationConsultationService(foodsService as never, evaluationService as never);

    const result = await service.evaluate('user-1', { ...resolution, ...input });

    expect(result).toBeUndefined();
    expect(foodsService.findDetailById).not.toHaveBeenCalled();
    expect(evaluationService.evaluateWithContext).not.toHaveBeenCalled();
  });
});
