import { NutritionAnalysisRepository } from '../repositories/nutrition-analysis.repository.js';
import { NutritionAnalysisService } from './nutrition-analysis.service.js';
import { NutritionCalculator } from './nutrition-calculator.js';
import { NutritionTargetCalculator } from './nutrition-target-calculator.js';
import { NutritionPolicyService } from './nutrition-policy.service.js';

describe('NutritionAnalysisService', () => {
  it('loads one UTC day and calculates its summary', async () => {
    const repository = {
      findMealsForDateRange: async (_userId: string, start: Date, end: Date) => {
        expect(start.toISOString()).toBe('2026-08-12T00:00:00.000Z');
        expect(end.toISOString()).toBe('2026-08-13T00:00:00.000Z');
        return [{
          id: 'meal-1',
          consumedAt: start,
          items: [{
            quantity: '2',
            servingGrams: '50',
            nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10' }],
          }],
        }];
      },
    } satisfies Pick<NutritionAnalysisRepository, 'findMealsForDateRange'>;
    const profilesRepository = { getMyProfile: async () => null };

    const policyService = new NutritionPolicyService(
      profilesRepository as any,
      { findUserConditions: async () => [] } as any,
      new NutritionTargetCalculator(),
      [
        { key: 'renal', load: async () => ({ egfrFinding: null, dialysisStatus: null, dialysisModality: null, dialysisReportedAt: null }) },
        { key: 'diabetes', load: async () => ({ carbohydrateTarget: null }) },
      ] as any,
    );
    const service = new NutritionAnalysisService(
      repository as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      policyService,
    );

    await expect(service.getDailySummary('user-1', '2026-08-12')).resolves.toEqual({
      date: '2026-08-12',
      mealCount: 1,
      totals: [{ name: 'Protein', unit: 'g', amount: '10' }],
      targets: { sodiumMilligrams: '2300', proteinGrams: null, saturatedFatGrams: '20', addedSugarGrams: '50', fiberGrams: '28' },
      targetProvenance: [expect.objectContaining({
        target: 'sodiumMilligrams',
        policyId: 'general-nutrition-sodium-v1',
      }), expect.objectContaining({
        target: 'saturatedFatGrams',
        policyId: 'general-nutrition-saturated-fat-v1',
      }), expect.objectContaining({
      target: 'addedSugarGrams',
      policyId: 'general-nutrition-added-sugars-v1',
      }), expect.objectContaining({
        target: 'fiberGrams',
        policyId: 'general-nutrition-fiber-v1',
      })],
      insights: [],
      deferredPolicies: [],
      mealAssessments: [expect.objectContaining({
        mealId: 'meal-1',
        status: 'insufficient-evidence',
        coverage: 0,
        limitations: [expect.objectContaining({ code: 'missing-current-evidence' })],
      })],
      caloriesConsumedKcal: null,
      remainingCaloriesKcal: null,
      calorieTargetPercentage: null,
    });
  });

  it('builds a seven-day summary from one meal query and shared target context', async () => {
    const repository = {
      findMealsForDateRange: async (_userId: string, start: Date, end: Date) => {
        expect(start.toISOString()).toBe('2026-08-10T00:00:00.000Z');
        expect(end.toISOString()).toBe('2026-08-17T00:00:00.000Z');
        return [{
          id: 'meal-1',
          consumedAt: new Date('2026-08-12T12:00:00.000Z'),
          items: [{
            quantity: '1',
            servingGrams: '100',
            nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10' }],
          }],
        }];
      },
    } satisfies Pick<NutritionAnalysisRepository, 'findMealsForDateRange'>;
    const policyService = new NutritionPolicyService(
      { getMyProfile: async () => null } as any,
      { findUserConditions: async () => [] } as any,
      new NutritionTargetCalculator(),
      [
        { key: 'renal', load: async () => ({ egfrFinding: null, dialysisStatus: null, dialysisModality: null, dialysisReportedAt: null }) },
        { key: 'diabetes', load: async () => ({ carbohydrateTarget: null }) },
      ] as any,
    );
    const service = new NutritionAnalysisService(
      repository as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      policyService,
    );

    const summary = await service.getWeeklySummary('user-1', '2026-08-10');

    expect(summary.startDate).toBe('2026-08-10');
    expect(summary.endDate).toBe('2026-08-16');
    expect(summary.days).toHaveLength(7);
    expect(summary.days[2]).toMatchObject({
      date: '2026-08-12',
      mealCount: 1,
      totals: [{ name: 'Protein', unit: 'g', amount: '10' }],
      targets: { sodiumMilligrams: '2300', proteinGrams: null, saturatedFatGrams: '20' },
      deferredPolicies: [],
    });
    expect(summary.days[0]).toMatchObject({ date: '2026-08-10', mealCount: 0, totals: [] });
  });

  it('calculates consumed calories, remaining budget, and target percentage', async () => {
    const repository = {
      findMealsForDateRange: async () => [{
        id: 'meal-1',
        consumedAt: new Date('2026-08-12T12:00:00.000Z'),
        items: [{
          quantity: '1',
          servingGrams: '100',
          nutrients: [{ name: 'Energy', unit: 'kcal', amountPer100Grams: '500' }],
        }],
      }],
    } satisfies Pick<NutritionAnalysisRepository, 'findMealsForDateRange'>;
    const service = new NutritionAnalysisService(
      repository as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      { calculateForUser: async () => ({
        targets: { sodiumMilligrams: '2300', proteinGrams: null, caloriesKcal: '2000' },
        adjustments: [],
        deferredPolicies: [],
      }) } as any,
    );

    await expect(service.getDailySummary('user-1', '2026-08-12')).resolves.toMatchObject({
      caloriesConsumedKcal: '500',
      remainingCaloriesKcal: '1500',
      calorieTargetPercentage: 25,
    });
  });

  it('exposes diabetes carbohydrate adherence from immutable snapshots', async () => {
    const repository = {
      findMealsForDateRange: async () => [{
        id: 'meal-1',
        consumedAt: new Date('2026-08-12T12:00:00.000Z'),
        items: [{
          quantity: '1',
          servingGrams: '100',
          nutrients: [{ name: 'Carbohydrates', unit: 'g', amountPer100Grams: '999' }],
        }],
      }],
    } satisfies Pick<NutritionAnalysisRepository, 'findMealsForDateRange'>;
    const service = new NutritionAnalysisService(
      repository as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      { calculateForUser: async () => ({
        targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
        adjustments: [],
        deferredPolicies: [],
        targetProvenance: [{
          target: 'carbohydrateGrams',
          policyId: 'diabetes-carbohydrate-target-v1',
          source: 'ADA Standards of Care in Diabetes—2026',
          version: 'v1',
          explanation: 'approved target',
        }],
      }) } as any,
      {
        findForUserDateRange: async () => [{
          id: 'snapshot-1',
          mealItemId: 'item-1',
          score: 100,
          coverage: 100,
          payload: {
            reasons: [],
            contributions: [{ nutrient: 'carbohydrates', amount: '40', targetValue: '180', currentDailyValue: null, explanation: 'snapshot contribution' }],
            targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
            deferredPolicies: [],
          },
          evaluatorVersion: 'food-evaluation-v1',
          policyVersion: 'nutrition-policies-v1',
          snapshotVersion: '1',
          evaluatedAt: new Date('2026-08-12T12:01:00.000Z'),
        }],
      } as any,
    );

    await expect(service.getDailySummary('user-1', '2026-08-12')).resolves.toMatchObject({
      diabetesCarbohydrateAdherence: {
        status: 'available',
        consumedCarbohydrateGrams: '40',
        remainingCarbohydrateGrams: '140',
        exceededByGrams: '0',
        coveragePercentage: 100,
        snapshotIds: ['snapshot-1'],
        targetProvenance: expect.objectContaining({ policyId: 'diabetes-carbohydrate-target-v1' }),
      },
    });
  });

  it('does not emit a standalone protein incompatibility insight for current CKD lower-target summaries', async () => {
    const repository = {
      findMealsForDateRange: async () => [{
        id: 'meal-1',
        consumedAt: new Date('2026-08-12T12:00:00.000Z'),
        items: [{
          quantity: '1',
          servingGrams: '100',
          nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '1' }],
        }],
      }],
    } satisfies Pick<NutritionAnalysisRepository, 'findMealsForDateRange'>;
    const service = new NutritionAnalysisService(
      repository as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      { calculateForUser: async () => ({
        targets: { sodiumMilligrams: '2300', proteinGrams: '64' },
        adjustments: [],
        deferredPolicies: [],
        targetProvenance: [{
          target: 'proteinGrams',
          policyId: 'ckd-non-dialysis-protein-v1',
          source: 'KDOQI Nutrition in CKD 2020',
          version: 'v1',
          explanation: 'Approved CKD protein target.',
        }],
      }) } as any,
    );

    const summary = await service.getDailySummary('user-1', '2026-08-12');

    expect(summary.insights).toEqual([]);
  });

  it('replays lower-target insight semantics from legacy historical snapshots', async () => {
    const service = new NutritionAnalysisService(
      { findMealsForDateRange: async () => [] } as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      { calculateForUser: async () => ({
        targets: { sodiumMilligrams: '2300', proteinGrams: null },
        adjustments: [],
        deferredPolicies: [],
      }) } as any,
      {
        findForUserDateRange: async () => [{
          id: 'snapshot-legacy',
          mealItemId: 'item-1',
          score: 1,
          coverage: 100,
          payload: {
            reasons: [{
              code: 'protein-below-weight-target',
              direction: 'negative',
              nutrient: 'protein',
              measuredValue: '0.73',
              targetValue: '64',
              explanation: 'The historical evaluator treated this portion as below the applicable protein target.',
            }],
            contributions: [{ nutrient: 'protein', amount: '0.73', targetValue: '64', currentDailyValue: null, explanation: 'Historical protein contribution.' }],
            targets: { sodiumMilligrams: '2300', proteinGrams: '64' },
            deferredPolicies: [],
          },
          evaluatorVersion: 'food-evaluation-v1',
          policyVersion: 'nutrition-policies-v1',
          snapshotVersion: '1',
          evaluatedAt: new Date('2026-08-12T12:01:00.000Z'),
        }],
      } as any,
    );

    const summary = await service.getHistoricalSummary('user-1', '2026-08-12');

    expect(summary.days[0]).toMatchObject({
      evaluationMode: 'historical-replay',
      insights: [{
        ruleId: 'protein-below-weight-target',
        evaluatorVersion: 'food-evaluation-v1',
        snapshotId: 'snapshot-legacy',
      }],
    });
  });

  it('replays the legacy universal cholesterol rule from an immutable v1 snapshot', async () => {
    const service = new NutritionAnalysisService(
      { findMealsForDateRange: async () => [] } as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      { calculateForUser: async () => ({
        targets: { sodiumMilligrams: '2300', proteinGrams: null },
        adjustments: [],
        deferredPolicies: [],
      }) } as any,
      {
        findForUserDateRange: async () => [{
          id: 'snapshot-cholesterol-v1',
          mealItemId: 'item-cholesterol-v1',
          score: 0,
          coverage: 100,
          payload: {
            reasons: [{
              code: 'cholesterol-above-target',
              direction: 'negative',
              nutrient: 'cholesterol',
              measuredValue: '400',
              targetValue: '300',
              explanation: 'The historical v1 evaluator applied the population cholesterol reference.',
            }],
            contributions: [{ nutrient: 'cholesterol', unit: 'mg', amount: '400', targetValue: '300', currentDailyValue: null, explanation: 'Historical cholesterol contribution.' }],
            targets: { sodiumMilligrams: '2300', proteinGrams: null, cholesterolMilligrams: '300' },
            deferredPolicies: [],
            targetProvenance: [{
              target: 'cholesterolMilligrams',
              policyId: 'general-nutrition-cholesterol-v1',
              source: 'FDA Daily Value reference',
              version: 'v1',
              explanation: 'Historical population reference.',
            }],
          },
          evaluatorVersion: 'food-evaluation-v3',
          policyVersion: 'nutrition-policies-v1',
          snapshotVersion: '1',
          evaluatedAt: new Date('2026-08-12T12:01:00.000Z'),
        }],
      } as any,
    );

    const summary = await service.getHistoricalSummary('user-1', '2026-08-12');

    expect(summary.days[0]).toMatchObject({
      evaluationMode: 'historical-replay',
      targets: { cholesterolMilligrams: '300' },
      targetProvenance: [expect.objectContaining({
        policyId: 'general-nutrition-cholesterol-v1',
        version: 'v1',
      })],
      insights: [expect.objectContaining({
        ruleId: 'cholesterol-above-target',
        snapshotId: 'snapshot-cholesterol-v1',
        evaluatorVersion: 'food-evaluation-v3',
      })],
    });
  });

  it('exposes a generic meal assessment from immutable item contributions', async () => {
    const sodiumRule = {
      family: 'numeric-constraint' as const,
      kind: 'upper-limit' as const,
      roles: ['compatibility', 'progress'] as const,
      scopes: ['food', 'meal', 'daily'] as const,
      measurementKey: 'sodium',
      unit: 'mg',
      weight: 40,
      target: 'sodiumMilligrams' as const,
      targetValue: '2300',
      policyId: 'general-nutrition-sodium-v1',
      policyVersion: 'v1',
      conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
      precedence: 10,
    };
    const proteinRule = {
      family: 'numeric-constraint' as const,
      kind: 'lower-target' as const,
      roles: ['contribution', 'progress'] as const,
      scopes: ['food', 'meal', 'daily'] as const,
      measurementKey: 'protein',
      unit: 'g',
      weight: 30,
      target: 'proteinGrams' as const,
      targetValue: '64',
      policyId: 'ckd-non-dialysis-protein-v1',
      policyVersion: 'v1',
      conflictKey: 'nutrition-target:proteinGrams:daily-lower-limit',
      precedence: 20,
    };
    const service = new NutritionAnalysisService(
      {
        findMealsForDateRange: async () => [{
          id: 'meal-1',
          consumedAt: new Date('2026-08-12T12:00:00.000Z'),
          items: [{ id: 'item-1', quantity: '1', servingGrams: '100', nutrients: [] }],
        }],
      } as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      { calculateForUser: async () => ({
        targets: { sodiumMilligrams: '2300', proteinGrams: '64' },
        adjustments: [],
        deferredPolicies: [],
        resolvedRules: [sodiumRule, proteinRule],
      }) } as any,
      {
        findForUserDateRange: async () => [{
          id: 'snapshot-1',
          mealItemId: 'item-1',
          score: 100,
          coverage: 100,
          payload: {
            reasons: [],
            contributions: [
              { nutrient: 'sodium', unit: 'mg', amount: '400', targetValue: '2300', currentDailyValue: null, explanation: 'Sodium contribution.' },
              { nutrient: 'protein', unit: 'g', amount: '12', targetValue: '64', currentDailyValue: null, explanation: 'Protein contribution.' },
            ],
            targets: { sodiumMilligrams: '2300', proteinGrams: '64' },
            deferredPolicies: [],
            resolvedRules: [sodiumRule, proteinRule],
            policySetFingerprint: 'policy-set-1',
          },
          evaluatorVersion: 'food-evaluation-v3',
          policyVersion: 'nutrition-policies-v1',
          snapshotVersion: '1',
          evaluatedAt: new Date('2026-08-12T12:01:00.000Z'),
        }],
      } as any,
    );

    const summary = await service.getDailySummary('user-1', '2026-08-12');

    expect(summary.mealAssessments).toEqual([expect.objectContaining({
      mealId: 'meal-1',
      status: 'evaluated',
      coverage: 100,
      snapshotIds: ['snapshot-1'],
      policySetFingerprint: 'policy-set-1',
      evaluatorVersion: 'food-evaluation-v3',
      rules: expect.arrayContaining([
        expect.objectContaining({ status: 'within-limit', measuredValue: '400' }),
        expect.objectContaining({ status: 'contribution', measuredValue: '12' }),
      ]),
    })]);
  });

  it('rejects mixed historical evaluator versions and preserves deferrals from every source snapshot', async () => {
    const sodiumRule = {
      family: 'numeric-constraint' as const,
      kind: 'upper-limit' as const,
      roles: ['compatibility', 'progress'] as const,
      scopes: ['food', 'meal', 'daily'] as const,
      measurementKey: 'sodium',
      unit: 'mg',
      weight: 40,
      target: 'sodiumMilligrams' as const,
      targetValue: '2300',
      policyId: 'general-nutrition-sodium-v1',
      policyVersion: 'v1',
      conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
      precedence: 10,
    };
    const firstDeferral = { policyId: 'ckd-policy-v1', reason: 'missing-egfr', explanation: 'First source is missing eGFR.' };
    const secondDeferral = { policyId: 'diabetes-policy-v1', reason: 'expired-target', explanation: 'Second source has an expired target.' };
    const snapshot = (id: string, evaluatorVersion: string, deferrals: readonly typeof firstDeferral[]) => ({
      id,
      mealItemId: `item-${id}`,
      score: 80,
      coverage: 100,
      payload: {
        reasons: [],
        contributions: [{ nutrient: 'sodium', unit: 'mg', amount: '400', targetValue: '2300', currentDailyValue: null, explanation: 'Sodium contribution.' }],
        targets: { sodiumMilligrams: '2300', proteinGrams: null },
        deferredPolicies: deferrals,
        resolvedRules: [sodiumRule],
        policySetFingerprint: 'policy-set-1',
      },
      evaluatorVersion,
      policyVersion: 'nutrition-policies-v1',
      snapshotVersion: '1',
      evaluatedAt: new Date(id === 'a' ? '2026-08-12T12:01:00.000Z' : '2026-08-12T12:02:00.000Z'),
    });
    const service = new NutritionAnalysisService(
      {
        findMealsForDateRange: async () => [{
          id: 'meal-1',
          consumedAt: new Date('2026-08-12T12:00:00.000Z'),
          items: [{ id: 'item-a', quantity: '1', servingGrams: '100', nutrients: [] }, { id: 'item-b', quantity: '1', servingGrams: '100', nutrients: [] }],
        }],
      } as unknown as NutritionAnalysisRepository,
      new NutritionCalculator(),
      { calculateForUser: async () => ({ targets: { sodiumMilligrams: '2300', proteinGrams: null }, adjustments: [], deferredPolicies: [] }) } as any,
      { findForUserDateRange: async () => [snapshot('a', 'food-evaluation-v1', [firstDeferral]), snapshot('b', 'food-evaluation-v2', [secondDeferral])] } as any,
    );

    const summary = await service.getHistoricalSummary('user-1', '2026-08-12');
    const assessment = summary.days[0]?.mealAssessments?.[0];

    expect(assessment).toMatchObject({
      status: 'insufficient-evidence',
      coverage: 0,
      rules: [],
      contributions: [],
      deferredPolicies: expect.arrayContaining([firstDeferral, secondDeferral]),
      limitations: [expect.objectContaining({ code: 'mixed-evaluator-versions' })],
    });
    expect(summary.days[0]?.deferredPolicies).toEqual(expect.arrayContaining([firstDeferral, secondDeferral]));
  });

  it('rejects mixed historical policy-set fingerprints instead of merging rules', async () => {
    const rule = {
      family: 'numeric-constraint' as const,
      kind: 'upper-limit' as const,
      roles: ['progress'] as const,
      scopes: ['meal'] as const,
      measurementKey: 'sodium',
      unit: 'mg',
      weight: 40,
      target: 'sodiumMilligrams' as const,
      targetValue: '2300',
      policyId: 'general-nutrition-sodium-v1',
      policyVersion: 'v1',
      conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
      precedence: 10,
    };
    const makeSnapshot = (id: string, fingerprint: string) => ({
      id,
      mealItemId: `item-${id}`,
      score: 80,
      coverage: 100,
      payload: {
        reasons: [],
        contributions: [{ nutrient: 'sodium', unit: 'mg', amount: '400', targetValue: '2300', currentDailyValue: null, explanation: 'Sodium contribution.' }],
        targets: { sodiumMilligrams: '2300', proteinGrams: null },
        deferredPolicies: [],
        resolvedRules: [rule],
        policySetFingerprint: fingerprint,
      },
      evaluatorVersion: 'food-evaluation-v1',
      policyVersion: 'nutrition-policies-v1',
      snapshotVersion: '1',
      evaluatedAt: new Date(id === 'a' ? '2026-08-12T12:01:00.000Z' : '2026-08-12T12:02:00.000Z'),
    });
    const service = new NutritionAnalysisService(
      { findMealsForDateRange: async () => [{ id: 'meal-1', consumedAt: new Date('2026-08-12T12:00:00.000Z'), items: [{ id: 'item-a', quantity: '1', servingGrams: '100', nutrients: [] }, { id: 'item-b', quantity: '1', servingGrams: '100', nutrients: [] }] }] } as any,
      new NutritionCalculator(),
      { calculateForUser: async () => ({ targets: { sodiumMilligrams: '2300', proteinGrams: null }, adjustments: [], deferredPolicies: [] }) } as any,
      { findForUserDateRange: async () => [makeSnapshot('a', 'policy-set-a'), makeSnapshot('b', 'policy-set-b')] } as any,
    );

    const summary = await service.getHistoricalSummary('user-1', '2026-08-12');

    expect(summary.days[0]?.mealAssessments?.[0]).toMatchObject({
      status: 'insufficient-evidence',
      rules: [],
      limitations: [expect.objectContaining({ code: 'mixed-policy-set-fingerprints' })],
    });
  });
});
