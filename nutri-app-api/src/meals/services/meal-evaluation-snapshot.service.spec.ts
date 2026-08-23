import { MealEvaluationSnapshotService } from './meal-evaluation-snapshot.service.js';

describe('MealEvaluationSnapshotService', () => {
  it('persists an immutable versioned evaluation payload', async () => {
    const repository = {
      create: async (input: any) => input,
    };
    const service = new MealEvaluationSnapshotService(
      {
        evaluateWithContext: async () => ({
          evaluation: {
            score: 92,
            coverage: 100,
            reasons: [{ code: 'sodium-contribution', direction: 'neutral', nutrient: 'sodium', measuredValue: '100', targetValue: '2300', explanation: 'Sodium is within the current limit.' }],
            contributions: [{ nutrient: 'calories', amount: '250', targetValue: null, currentDailyValue: null, explanation: 'This portion provides 250 kcal.' }],
            deferredPolicies: [],
          },
          targetCalculation: {
            targets: { sodiumMilligrams: '2300', proteinGrams: '60' },
            adjustments: [],
            deferredPolicies: [],
            energyGoal: 'maintenance',
            targetProvenance: [],
          },
        }),
      } as any,
      repository as any,
    );

    await expect(service.captureForMealItem('user-1', {
      id: 'item-1',
      food: { id: 'food-1', name: 'Food' },
      serving: { id: 'serving-1', name: '100 g', grams: '100' },
      quantity: '1',
    })).resolves.toMatchObject({
      mealItemId: 'item-1',
      score: 92,
      coverage: 100,
      evaluatorVersion: 'food-evaluation-v3',
      policyVersion: 'nutrition-policies-v1',
      snapshotVersion: '1',
      payload: {
        targets: { sodiumMilligrams: '2300', proteinGrams: '60' },
        goal: 'maintenance',
      },
    });
  });
});
