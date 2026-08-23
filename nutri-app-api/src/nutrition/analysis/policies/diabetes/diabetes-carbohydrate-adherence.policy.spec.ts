import { DiabetesCarbohydrateAdherencePolicy } from './diabetes-carbohydrate-adherence.policy.js';

function snapshot(id: string, mealItemId: string, amount: string, evaluatedAt = '2026-08-12T12:00:00.000Z') {
  return {
    id,
    mealItemId,
    score: 100,
    coverage: 100,
    payload: {
      reasons: [],
      contributions: [{
        nutrient: 'carbohydrates', amount, targetValue: '180', currentDailyValue: null,
        explanation: 'recorded carbohydrate contribution',
      }],
      targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
      deferredPolicies: [],
    },
    evaluatorVersion: 'food-evaluation-v1',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '1',
    evaluatedAt: new Date(evaluatedAt),
  };
}

describe('DiabetesCarbohydrateAdherencePolicy', () => {
  const policy = new DiabetesCarbohydrateAdherencePolicy();
  const provenance = {
    target: 'carbohydrateGrams' as const,
    policyId: 'diabetes-carbohydrate-target-v1',
    source: 'ADA Standards of Care in Diabetes—2026',
    version: 'v1',
    explanation: 'approved individualized target',
  };

  it('calculates consumed, remaining, exceeded, and coverage from snapshots', () => {
    expect(policy.calculate({
      targetCarbohydrateGrams: '180',
      targetProvenance: provenance,
      targetDeferral: null,
      snapshots: [snapshot('s1', 'i1', '60'), snapshot('s2', 'i2', '80')],
      expectedMealItemCount: 2,
    })).toMatchObject({
      status: 'available',
      targetCarbohydrateGrams: '180',
      consumedCarbohydrateGrams: '140',
      remainingCarbohydrateGrams: '40',
      exceededByGrams: '0',
      coveragePercentage: 100,
      targetProvenance: provenance,
      snapshotIds: ['s1', 's2'],
    });
  });

  it('reports an exceeded target deterministically and uses the latest snapshot per item', () => {
    expect(policy.calculate({
      targetCarbohydrateGrams: '100',
      targetProvenance: provenance,
      targetDeferral: null,
      snapshots: [
        snapshot('old', 'i1', '40'),
        snapshot('new', 'i1', '70', '2026-08-12T13:00:00.000Z'),
        snapshot('s2', 'i2', '50'),
      ],
      expectedMealItemCount: 2,
    })).toMatchObject({
      status: 'available',
      consumedCarbohydrateGrams: '120',
      remainingCarbohydrateGrams: '0',
      exceededByGrams: '20',
      snapshotIds: ['new', 's2'],
    });
  });

  it('defers when the target is unavailable or snapshot coverage is incomplete', () => {
    expect(policy.calculate({
      targetCarbohydrateGrams: null,
      targetProvenance: null,
      targetDeferral: {
        policyId: 'diabetes-carbohydrate-target-v1',
        reason: 'expired-individualized-carbohydrate-target',
        explanation: 'expired',
      },
      snapshots: [],
      expectedMealItemCount: 1,
    }).deferredPolicy).toMatchObject({ reason: 'expired-individualized-carbohydrate-target' });

    expect(policy.calculate({
      targetCarbohydrateGrams: '180',
      targetProvenance: provenance,
      targetDeferral: null,
      snapshots: [snapshot('s1', 'i1', '60')],
      expectedMealItemCount: 2,
    }).deferredPolicy).toMatchObject({ reason: 'insufficient-historical-coverage' });
  });
});
