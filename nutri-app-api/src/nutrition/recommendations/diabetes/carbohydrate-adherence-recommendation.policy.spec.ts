import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { DiabetesCarbohydrateAdherenceRecommendationPolicy } from './carbohydrate-adherence-recommendation.policy.js';
import { DiabetesCarbohydrateAdherenceRecommendationContext } from './carbohydrate-adherence-recommendation.types.js';

function context(adherence: DailyNutritionSummarySource['diabetesCarbohydrateAdherence'], deferredPolicies = []): DiabetesCarbohydrateAdherenceRecommendationContext {
  const summary = {
    date: '2026-08-19',
    mealCount: 3,
    totals: [],
    targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
    insights: [],
    deferredPolicies,
    caloriesConsumedKcal: '1200',
    remainingCaloriesKcal: '800',
    calorieTargetPercentage: 60,
    diabetesCarbohydrateAdherence: adherence,
  } as DailyNutritionSummarySource;
  return {
    contextId: 'recommendations-daily-user-1-2026-08-19',
    userId: 'user-1',
    scope: 'daily',
    asOf: '2026-08-19T23:59:59.999Z',
    projection: { summary },
    sources: [],
  };
}

const provenance = {
  target: 'carbohydrateGrams' as const,
  policyId: 'diabetes-carbohydrate-target-v1',
  source: 'ADA Standards of Care in Diabetes—2026',
  version: 'diabetes-carbohydrate-target-v1',
  explanation: 'Approved individualized carbohydrate target.',
};

describe('DiabetesCarbohydrateAdherenceRecommendationPolicy', () => {
  const policy = new DiabetesCarbohydrateAdherenceRecommendationPolicy();

  it('provides positive progress feedback from the existing adherence projection', () => {
    const [candidate] = policy.evaluate(context({
      status: 'available',
      targetCarbohydrateGrams: '180',
      consumedCarbohydrateGrams: '120',
      remainingCarbohydrateGrams: '60',
      exceededByGrams: '0',
      coveragePercentage: 100,
      targetProvenance: provenance,
      snapshotIds: ['snapshot-1'],
      deferredPolicy: null,
    }));

    expect(candidate.recommendation).toMatchObject({
      id: 'diabetes-carbohydrate-adherence-positive',
      category: 'positive',
      nutrient: 'carbohydrates',
    });
    expect(candidate.recommendation.message).toContain('120 g consumed');
    expect(candidate.recommendation.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'diabetesCarbohydrateAdherence.targetProvenance' }),
      expect.objectContaining({ field: 'diabetesCarbohydrateAdherence.snapshotIds', value: 'snapshot-1' }),
    ]));
  });

  it('provides caution and improvement guidance when the projection reports an exceedance', () => {
    const candidates = policy.evaluate(context({
      status: 'available',
      targetCarbohydrateGrams: '180',
      consumedCarbohydrateGrams: '195',
      remainingCarbohydrateGrams: '0',
      exceededByGrams: '15',
      coveragePercentage: 100,
      targetProvenance: provenance,
      snapshotIds: ['snapshot-1', 'snapshot-2'],
      deferredPolicy: null,
    }));

    expect(candidates.map(({ recommendation }) => recommendation.category)).toEqual(['caution', 'improvement']);
  });

  it('explains missing or expired evidence through the existing deferral', () => {
    const [candidate] = policy.evaluate(context(null, [{
      policyId: 'diabetes-carbohydrate-adherence-v1',
      reason: 'expired-individualized-carbohydrate-target',
      explanation: 'The individualized carbohydrate target has expired.',
    }]));

    expect(candidate.recommendation).toMatchObject({
      id: 'diabetes-carbohydrate-adherence-deferred-expired-individualized-carbohydrate-target',
      category: 'deferred-policy',
    });
    expect(candidate.recommendation.message).toBe('The individualized carbohydrate target has expired.');
  });
});
