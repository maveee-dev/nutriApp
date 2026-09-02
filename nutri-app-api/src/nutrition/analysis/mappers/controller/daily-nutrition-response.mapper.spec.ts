import { DailyNutritionResponseMapper } from './daily-nutrition-response.mapper.js';

describe('DailyNutritionResponseMapper', () => {
  it('maps typed meal rule semantics and replay metadata without removing legacy fields', () => {
    const response = DailyNutritionResponseMapper.toResponseDto({
      date: '2026-08-12',
      mealCount: 1,
      totals: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      insights: [],
      deferredPolicies: [],
      caloriesConsumedKcal: null,
      remainingCaloriesKcal: null,
      calorieTargetPercentage: null,
      mealAssessments: [{
        mealId: 'meal-1',
        status: 'evaluated',
        coverage: 100,
        contributions: [{ nutrient: 'sodium', unit: 'mg', amount: '400', targetValue: '2300', currentDailyValue: null, explanation: 'Within limit.' }],
        rules: [{
          rule: {
            family: 'numeric-constraint',
            kind: 'upper-limit',
            roles: ['compatibility', 'progress'],
            scopes: ['food', 'meal', 'daily'],
            measurementKey: 'sodium',
            unit: 'mg',
            weight: 40,
            target: 'sodiumMilligrams',
            targetValue: '2300',
            policyId: 'general-nutrition-sodium-v1',
            policyVersion: 'v1',
            conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
            precedence: 10,
          },
          measuredValue: '400',
          targetValue: '2300',
          percentageOfTarget: 17.39,
          status: 'within-limit',
          direction: 'neutral',
          explanation: 'Within limit.',
        }],
        deferredPolicies: [],
        limitations: [],
        snapshotIds: ['snapshot-1'],
        evaluatorVersion: 'food-evaluation-v3',
        policySetFingerprint: 'policy-set-1',
        evaluationFingerprint: 'sha256:meal',
      }],
    });

    expect(response.targets).toEqual({ sodiumMilligrams: '2300', proteinGrams: null });
    expect(response.mealAssessments?.[0]).toMatchObject({
      mealId: 'meal-1',
      snapshotIds: ['snapshot-1'],
      evaluatorVersion: 'food-evaluation-v3',
      policySetFingerprint: 'policy-set-1',
      evaluationFingerprint: 'sha256:meal',
      rules: [{
        rule: expect.objectContaining({ kind: 'upper-limit', roles: ['compatibility', 'progress'], scopes: ['food', 'meal', 'daily'], policyId: 'general-nutrition-sodium-v1' }),
        status: 'within-limit',
      }],
    });
  });

  it('maps generic per-policy adherence with its replay metadata', () => {
    const response = DailyNutritionResponseMapper.toResponseDto({
      date: '2026-08-12',
      mealCount: 1,
      totals: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null, potassiumMilligrams: '2000' },
      insights: [],
      deferredPolicies: [],
      caloriesConsumedKcal: null,
      remainingCaloriesKcal: null,
      calorieTargetPercentage: null,
      dailyAdherenceByPolicy: [{
        policyId: 'ckd-potassium-v1',
        policyVersion: 'v1',
        target: 'potassiumMilligrams',
        measurementKey: 'potassium',
        ruleKind: 'upper-limit',
        status: 'available',
        targetValue: '2000',
        consumedValue: '900',
        remainingValue: '1100',
        exceededValue: null,
        coveragePercentage: 100,
        targetProvenance: null,
        snapshotIds: ['snapshot-potassium'],
        deferredPolicy: null,
        evaluatorVersion: 'food-evaluation-v3',
        policySetFingerprint: 'policy-set-1',
        evaluationFingerprint: 'daily-potassium',
      }],
    });

    expect(response.targets.potassiumMilligrams).toBe('2000');
    expect(response.dailyAdherenceByPolicy).toEqual([expect.objectContaining({
      policyId: 'ckd-potassium-v1',
      measurementKey: 'potassium',
      snapshotIds: ['snapshot-potassium'],
      evaluationFingerprint: 'daily-potassium',
    })]);
  });
});
