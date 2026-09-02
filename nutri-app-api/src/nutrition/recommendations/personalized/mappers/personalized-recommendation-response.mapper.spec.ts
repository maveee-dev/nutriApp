import { PersonalizedRecommendationResponseMapper } from './personalized-recommendation-response.mapper.js';

describe('PersonalizedRecommendationResponseMapper', () => {
  it('preserves canonical identity, evaluation, insights, and provenance in the DTO', () => {
    const dto = PersonalizedRecommendationResponseMapper.toDto({
      date: '2026-08-31',
      goal: 'BALANCED',
      mealType: null,
      recommendations: [{
        foodId: 'food-1', canonicalName: 'Rice, white, cooked', displayName: 'White Rice', variantLabel: 'Cooked', category: 'Grain', servingId: 'serving-1', servingName: '1 cup', servingGrams: '158', quantity: '1', compatibilityScore: 90, coverage: 100, evaluationStatus: 'evaluated', remainingBudgetImpact: [], nutritionHighlights: [{ nutrient: 'carbohydrates', amount: '45', unit: 'g' }], whyRecommended: 'A deterministic reason.', limitations: [], nutritionInsights: [], evaluation: { score: 90, coverage: 100, evaluationStatus: 'evaluated', reasons: [], contributions: [], deferredPolicies: [] },
      }],
      remainingBudget: {}, laboratoryConsiderations: [], profileConsiderations: [], limitations: [], provenance: { foodSource: 'canonical-food-database', selection: 'deterministic', evaluatorVersion: 'food-evaluation-v3', policySetFingerprint: 'policy', activeTargetIds: ['target-1'] },
    });

    expect(dto.recommendations[0]).toMatchObject({ foodId: 'food-1', canonicalName: 'Rice, white, cooked', displayName: 'White Rice', compatibilityScore: 90 });
    expect(dto.provenance.activeTargetIds).toEqual(['target-1']);
  });
});
