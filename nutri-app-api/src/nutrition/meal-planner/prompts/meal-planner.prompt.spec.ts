import { buildMealPlannerPrompt } from './meal-planner.prompt.js';

describe('buildMealPlannerPrompt', () => {
  it('sends only the deterministic recommendation projection to AI', () => {
    const prompt = buildMealPlannerPrompt({
      date: '2026-08-30',
      mealType: 'BREAKFAST',
      focus: 'BALANCED',
      foods: [{
        foodId: 'food-1', name: 'Canonical Food', displayName: 'Oats', variantLabel: 'Cooked', servingId: 'serving-1', servingName: '1 cup', servingGrams: '234', quantity: '1', score: 95, coverage: 100, evaluationStatus: 'evaluated', category: 'Grains',
        keyNutrients: [{ nutrient: 'protein', amount: '6', unit: 'g' }],
        evaluation: { score: 95, coverage: 100, reasons: [], contributions: [], deferredPolicies: [] },
        nutritionInsights: [],
      }],
      summary: { protein: { amount: '6', unit: 'g' } },
      remainingBudget: {},
      limitations: [],
      provenance: { foodSource: 'canonical-food-database', selection: 'deterministic', evaluatorVersion: 'food-evaluation-v3', policySetFingerprint: 'policy' },
    });

    expect(prompt.consultationType).toBe('recommendation');
    expect(prompt.recommendations[0]).toMatchObject({ title: 'Oats' });
    expect(prompt.recommendations[0]?.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'foodId', value: 'food-1' }),
      expect.objectContaining({ field: 'protein', value: '6', unit: 'g' }),
    ]));
    expect(prompt.userQuestion).toContain('breakfast');
  });
});
