import { createRecommendationPolicyRegistrations } from './recommendation-registrations.js';
import { RecommendationService } from './recommendation.service.js';
import { recommendationConflictKey } from './types/recommendation-candidate.type.js';
import { AnyRecommendationPolicyRegistration } from './types/recommendation-registration.type.js';

function snapshot() {
  return {
    id: 'snapshot-1',
    mealItemId: 'item-1',
    score: 90,
    coverage: 100,
    payload: {
      reasons: [],
      contributions: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      deferredPolicies: [],
    },
    evaluatorVersion: 'food-evaluation-v1',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '1',
    evaluatedAt: new Date('2026-08-17T04:00:00.000Z'),
  };
}

describe('RecommendationService', () => {
  it('registers sodium, cardiovascular saturated-fat, and generic deferred-policy mechanisms by default', () => {
    expect(createRecommendationPolicyRegistrations().map(({ policy }) => policy.policyId)).toEqual([
      'sodium-recommendation',
      'cardiovascular-saturated-fat-recommendation',
      'diabetes-carbohydrate-adherence-recommendation',
      'diabetes-historical-carbohydrate-adherence-recommendation',
      'general-nutrition-added-sugar-recommendation',
      'general-nutrition-cholesterol-recommendation',
      'protein-condition-target-recommendation',
      'carbohydrates-condition-target-recommendation',
      'meal-assessment-recommendation',
      'deferred-policy-recommendation',
    ]);
  });

  it('composes daily Diabetes adherence recommendations from the existing projection', () => {
    const result = new RecommendationService().recommendDaily('user-1', {
      date: '2026-08-19',
      mealCount: 3,
      totals: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
      insights: [],
      deferredPolicies: [],
      caloriesConsumedKcal: '1200',
      remainingCaloriesKcal: '800',
      calorieTargetPercentage: 60,
      diabetesCarbohydrateAdherence: {
        status: 'available',
        targetCarbohydrateGrams: '180',
        consumedCarbohydrateGrams: '120',
        remainingCarbohydrateGrams: '60',
        exceededByGrams: '0',
        coveragePercentage: 100,
        targetProvenance: {
          target: 'carbohydrateGrams',
          policyId: 'diabetes-carbohydrate-target-v1',
          source: 'ADA Standards of Care in Diabetes—2026',
          version: 'diabetes-carbohydrate-target-v1',
          explanation: 'Approved individualized carbohydrate target.',
        },
        snapshotIds: ['snapshot-1'],
        deferredPolicy: null,
      },
    });

    expect(result.selected.map(({ id }) => id)).toEqual(['diabetes-carbohydrate-adherence-positive']);
  });

  it('prefers the Diabetes-owned explanation over the generic deferral explanation', () => {
    const result = new RecommendationService().recommendDaily('user-1', {
      date: '2026-08-19',
      mealCount: 1,
      totals: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      insights: [],
      deferredPolicies: [{
        policyId: 'diabetes-carbohydrate-adherence-v1',
        reason: 'insufficient-historical-coverage',
        explanation: 'One meal item is missing a valid immutable carbohydrate snapshot.',
      }],
      caloriesConsumedKcal: '0',
      remainingCaloriesKcal: null,
      calorieTargetPercentage: null,
    });

    expect(result.selected.map(({ id }) => id)).toEqual(['diabetes-carbohydrate-adherence-deferred-insufficient-historical-coverage']);
  });

  it('composes historical carbohydrate adherence recommendations from daily projections', () => {
    const daily = (date: string, consumed: string, exceeded: string) => ({
      date, mealCount: 1, totals: [], targets: { sodiumMilligrams: '2300', proteinGrams: null }, insights: [], deferredPolicies: [], caloriesConsumedKcal: '0', remainingCaloriesKcal: null, calorieTargetPercentage: null,
      diabetesCarbohydrateAdherence: { status: 'available' as const, targetCarbohydrateGrams: '180', consumedCarbohydrateGrams: consumed, remainingCarbohydrateGrams: '0', exceededByGrams: exceeded, coveragePercentage: 100, targetProvenance: { target: 'carbohydrateGrams' as const, policyId: 'diabetes-carbohydrate-target-v1', source: 'ADA', version: 'v1', explanation: 'Approved target.' }, snapshotIds: [`snapshot-${date}`], deferredPolicy: null },
    });
    const result = new RecommendationService().recommendHistorical('user-1', [daily('2026-08-18', '200', '20'), daily('2026-08-19', '195', '15')]);
    expect(result.selected.map(({ category }) => category)).toEqual(['caution', 'improvement', 'positive']);
  });

  it('composes weekly recommendations from the same daily projections', () => {
    const result = new RecommendationService().recommendWeekly('user-1', [], '2026-08-12', '2026-08-18');
    expect(result).toEqual({ selected: [], suppressed: [] });
  });

  it('composes the cardiovascular saturated-fat policy through the service', () => {
    const result = new RecommendationService().recommend('user-1', {
      ...snapshot(),
      payload: {
        ...snapshot().payload,
        contributions: [{
          nutrient: 'saturated-fat',
          amount: '25',
          targetValue: '20',
          currentDailyValue: null,
          explanation: '25 g saturated fat contribution.',
        }],
        targets: { sodiumMilligrams: '2300', proteinGrams: null, saturatedFatGrams: '20' },
        targetProvenance: [{
          target: 'saturatedFatGrams',
          policyId: 'cardiovascular-saturated-fat-v1',
          source: 'AHA',
          version: 'cardiovascular-saturated-fat-v1',
          explanation: 'AHA cardiovascular saturated-fat target.',
        }],
      },
    }, 'current-meal');

    expect(result.selected.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'cardiovascular-saturated-fat-caution',
      'cardiovascular-saturated-fat-improvement',
    ]));
  });

  it('carries current snapshot evaluation metadata without recalculating it', () => {
    const result = new RecommendationService().recommend('user-1', {
      ...snapshot(),
      score: 0,
      coverage: 0,
      evaluatorVersion: 'food-evaluation-v3',
      payload: {
        reasons: [],
        contributions: [],
        evaluationStatus: 'insufficient-evidence',
        targets: { sodiumMilligrams: '2300', proteinGrams: null },
        deferredPolicies: [{ policyId: 'cardiovascular-sodium-v1', reason: 'missing-sodium', explanation: 'Sodium evidence is unavailable.' }],
        policySetFingerprint: 'policy-set-snapshot-1',
        snapshotFingerprint: 'snapshot-fingerprint-1',
      },
    });

    expect(result.evaluation).toMatchObject({
      evaluationStatus: 'insufficient-evidence',
      coverage: 0,
      deferredPolicies: [{ policyId: 'cardiovascular-sodium-v1' }],
      snapshotIds: ['snapshot-1'],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['policy-set-snapshot-1'],
      snapshotFingerprints: ['snapshot-fingerprint-1'],
    });
  });

  it('consumes generic daily adherence and meal assessment projections', () => {
    const summary = {
      date: '2026-08-19',
      mealCount: 1,
      totals: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
      insights: [],
      deferredPolicies: [],
      caloriesConsumedKcal: '500',
      remainingCaloriesKcal: '1500',
      calorieTargetPercentage: 25,
      dailyAdherence: {
        status: 'available' as const,
        targetValue: '180',
        consumedValue: '220',
        remainingValue: '0',
        exceededValue: '40',
        coveragePercentage: 100,
        targetProvenance: { target: 'carbohydrateGrams' as const, policyId: 'diabetes-carbohydrate-target-v1', source: 'ADA', version: 'v1', explanation: 'Approved target.' },
        snapshotIds: ['snapshot-1'],
        deferredPolicy: null,
        evaluatorVersion: 'food-evaluation-v3',
        policySetFingerprint: 'policy-set-1',
        evaluationFingerprint: 'daily-fingerprint',
      },
      mealAssessments: [{
        mealId: 'meal-1',
        status: 'evaluated' as const,
        coverage: 100,
        contributions: [],
        rules: [{
          rule: {
            family: 'numeric-constraint' as const,
            kind: 'upper-limit' as const,
            roles: ['compatibility', 'progress'] as const,
            scopes: ['food', 'meal', 'daily'] as const,
            measurementKey: 'sodium',
            unit: 'mg',
            weight: 1,
            target: '2300',
            targetValue: '2300',
            policyId: 'general-nutrition-sodium-v1',
            policyVersion: 'v1',
            conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
            precedence: 1,
          },
          measuredValue: '2400',
          targetValue: '2300',
          percentageOfTarget: 104.35,
          status: 'exceeded' as const,
          direction: 'negative' as const,
          explanation: 'This meal exceeds the applicable sodium limit.',
        }],
        deferredPolicies: [],
        limitations: [],
        snapshotIds: ['snapshot-1'],
        evaluatorVersion: 'food-evaluation-v3',
        policySetFingerprint: 'policy-set-1',
        evaluationFingerprint: 'meal-fingerprint',
      }],
      snapshotIds: ['snapshot-1'],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['policy-set-1'],
      snapshotFingerprints: ['snapshot-fingerprint-1'],
    };

    const result = new RecommendationService().recommendDaily('user-1', summary);

    expect(result.selected.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'diabetes-carbohydrate-adherence-caution',
      expect.stringContaining('meal-assessment-recommendation-2026-08-19-meal-1-caution'),
    ]));
    expect(result.evaluation).toMatchObject({
      dailyAdherence: expect.objectContaining({ consumedValue: '220', evaluationFingerprint: 'daily-fingerprint' }),
      mealAssessments: [expect.objectContaining({ mealId: 'meal-1', evaluationFingerprint: 'meal-fingerprint' })],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['policy-set-1'],
      snapshotFingerprints: ['snapshot-fingerprint-1'],
    });
  });

  it('preserves per-day historical projections and replay metadata', () => {
    const day = (date: string, snapshotId: string) => ({
      date,
      mealCount: 1,
      totals: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      insights: [],
      deferredPolicies: [],
      caloriesConsumedKcal: '0',
      remainingCaloriesKcal: null,
      calorieTargetPercentage: null,
      evaluationMode: 'historical-replay' as const,
      snapshotIds: [snapshotId],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['policy-set-1'],
      snapshotFingerprints: [`fingerprint-${date}`],
      mealAssessments: [],
    });

    const result = new RecommendationService().recommendHistorical('user-1', [day('2026-08-18', 'snapshot-a'), day('2026-08-19', 'snapshot-b')]);

    expect(result.evaluation).toMatchObject({
      evaluationMode: 'historical-replay',
      snapshotIds: ['snapshot-a', 'snapshot-b'],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['policy-set-1'],
      snapshotFingerprints: ['fingerprint-2026-08-18', 'fingerprint-2026-08-19'],
      mealAssessmentsByDate: [{ date: '2026-08-18' }, { date: '2026-08-19' }],
    });
  });

  it('preserves combined-condition provenance and deferrals for downstream consumers', () => {
    const result = new RecommendationService().recommendDaily('user-1', {
      date: '2026-08-19',
      mealCount: 2,
      totals: [],
      targets: { sodiumMilligrams: '1500', proteinGrams: '64', carbohydrateGrams: '180' },
      insights: [],
      deferredPolicies: [{ policyId: 'cardiovascular-sodium-v1', reason: 'stale-context', explanation: 'The hypertension evidence is stale.' }],
      caloriesConsumedKcal: '900',
      remainingCaloriesKcal: '1100',
      calorieTargetPercentage: 45,
      targetProvenance: [
        { target: 'proteinGrams', policyId: 'ckd-non-dialysis-protein-v1', source: 'KDOQI', version: 'v1', explanation: 'CKD protein target.' },
        { target: 'carbohydrateGrams', policyId: 'diabetes-carbohydrate-target-v1', source: 'ADA', version: 'v1', explanation: 'Individualized carbohydrate target.' },
        { target: 'sodiumMilligrams', policyId: 'cardiovascular-sodium-v1', source: 'AHA', version: 'v1', explanation: 'Cardiovascular sodium target.' },
      ],
      dailyAdherence: {
        status: 'deferred',
        targetValue: '180',
        consumedValue: null,
        remainingValue: null,
        exceededValue: null,
        coveragePercentage: null,
        targetProvenance: { target: 'carbohydrateGrams', policyId: 'diabetes-carbohydrate-target-v1', source: 'ADA', version: 'v1', explanation: 'Individualized carbohydrate target.' },
        snapshotIds: [],
        deferredPolicy: { policyId: 'diabetes-carbohydrate-adherence-v1', reason: 'insufficient-historical-coverage', explanation: 'A meal snapshot is missing.' },
      },
      snapshotIds: [],
      evaluatorVersions: [],
      policySetFingerprints: [],
      snapshotFingerprints: [],
    });

    expect(result.evaluation).toMatchObject({
      targetProvenance: expect.arrayContaining([
        expect.objectContaining({ policyId: 'ckd-non-dialysis-protein-v1' }),
        expect.objectContaining({ policyId: 'diabetes-carbohydrate-target-v1' }),
        expect.objectContaining({ policyId: 'cardiovascular-sodium-v1' }),
      ]),
      deferredPolicies: expect.arrayContaining([
        expect.objectContaining({ policyId: 'cardiovascular-sodium-v1' }),
      ]),
      dailyAdherence: expect.objectContaining({ status: 'deferred' }),
    });
  });

  it('builds contexts and executes only policies applicable to the requested scope', () => {
    let contextBuilt = false;
    let policyExecuted = false;
    const registration: AnyRecommendationPolicyRegistration = {
      policy: {
        policyId: 'test-daily-policy',
        version: 'test-v1',
        scopes: ['daily'],
        evaluate: (context) => {
          policyExecuted = context.scope === 'daily';
          return [{
            candidateId: 'test-candidate',
            conflictKey: recommendationConflictKey('test', 'subject', context.scope, 'result'),
            priority: 1,
            specificity: 1,
            recommendation: {
              id: 'test-recommendation',
              category: 'educational',
              disposition: 'informational',
              severity: 'low',
              scope: context.scope,
              title: 'Test',
              message: 'Test',
              evidence: [],
              policy: { policyId: 'test-daily-policy', version: 'test-v1' },
            },
          }];
        },
      },
      buildContext: (baseContext) => {
        contextBuilt = true;
        return { ...baseContext, projection: { built: true } };
      },
    };

    const service = new RecommendationService([registration]);
    const currentFoodResult = service.recommend('user-1', snapshot(), 'current-food');
    expect(currentFoodResult.selected).toEqual([]);
    expect(contextBuilt).toBe(false);
    expect(policyExecuted).toBe(false);

    const dailyResult = service.recommend('user-1', snapshot(), 'daily');
    expect(dailyResult.selected.map(({ id }) => id)).toEqual(['test-recommendation']);
    expect(contextBuilt).toBe(true);
    expect(policyExecuted).toBe(true);
  });
});
