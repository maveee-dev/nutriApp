import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { CardiovascularSaturatedFatRecommendationPolicy } from './saturated-fat-recommendation.policy.js';
import { SaturatedFatRecommendationContext } from './saturated-fat-recommendation.types.js';

function context(overrides: Record<string, unknown> = {}): SaturatedFatRecommendationContext {
  const snapshot: MealEvaluationSnapshotSource = {
    id: 'snapshot-1',
    mealItemId: 'item-1',
    score: 90,
    coverage: 100,
    payload: {},
    evaluatorVersion: 'food-evaluation-v1',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '1',
    evaluatedAt: new Date('2026-08-19T00:00:00.000Z'),
  };
  return {
    contextId: 'snapshot-1:current-food',
    userId: 'user-1',
    scope: 'current-food',
    asOf: snapshot.evaluatedAt.toISOString(),
    projection: {
      snapshot,
      payload: {
        contributions: [{
          nutrient: 'saturated-fat',
          amount: '10',
          targetValue: '20',
          currentDailyValue: null,
          explanation: '10 g saturated fat contribution.',
        }],
        targets: { sodiumMilligrams: '2300', proteinGrams: null, saturatedFatGrams: '20' },
        deferredPolicies: [],
        targetProvenance: [{
          target: 'saturatedFatGrams',
          policyId: 'cardiovascular-saturated-fat-v1',
          source: 'AHA',
          version: 'cardiovascular-saturated-fat-v1',
          explanation: 'AHA cardiovascular saturated-fat target.',
        }],
        ...overrides,
      },
    },
    sources: [],
  } as SaturatedFatRecommendationContext;
}

describe('CardiovascularSaturatedFatRecommendationPolicy', () => {
  const policy = new CardiovascularSaturatedFatRecommendationPolicy();

  it('produces positive feedback when the contribution is within target', () => {
    const [candidate] = policy.evaluate(context());

    expect(candidate.recommendation.category).toBe('positive');
    expect(candidate.recommendation.id).toBe('cardiovascular-saturated-fat-positive');
    expect(candidate.recommendation.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'targets.saturatedFatGrams.provenance', value: 'cardiovascular-saturated-fat-v1:cardiovascular-saturated-fat-v1' }),
    ]));
  });

  it('produces caution and improvement candidates when the target is exceeded', () => {
    const candidates = policy.evaluate(context({
      contributions: [{
        nutrient: 'saturated-fat',
        amount: '25',
        targetValue: '20',
        currentDailyValue: null,
        explanation: '25 g saturated fat contribution.',
      }],
    }));

    expect(candidates.map(({ recommendation }) => recommendation.category)).toEqual(['caution', 'improvement']);
    expect(candidates.map(({ conflictKey }) => conflictKey)).toEqual([
      'nutrient:saturated-fat:current-food:caution',
      'nutrient:saturated-fat:current-food:improvement',
    ]);
  });

  it('deterministically explains deferred cardiovascular guidance', () => {
    const [candidate] = policy.evaluate(context({
      deferredPolicies: [{
        policyId: 'cardiovascular-saturated-fat-v1',
        reason: 'missing-maintenance-energy',
        explanation: 'Maintenance energy is unavailable.',
      }],
    }));

    expect(candidate.recommendation.category).toBe('deferred-policy');
    expect(candidate.recommendation.id).toBe('cardiovascular-saturated-fat-deferred-missing-maintenance-energy');
    expect(candidate.recommendation.message).toBe('Maintenance energy is unavailable.');
    expect(candidate.recommendation.evidence[0]).toEqual(expect.objectContaining({ value: 'missing-maintenance-energy' }));
  });
});
