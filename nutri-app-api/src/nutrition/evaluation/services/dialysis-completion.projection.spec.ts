import { jest } from '@jest/globals';
import { DialysisModality, DialysisStatus } from '../../../../generated/prisma/client.js';
import { NutritionTargetCalculator } from '../../analysis/services/nutrition-target-calculator.js';
import { createDailyNutritionProjectionRegistrations } from '../../analysis/services/daily-nutrition-projection-registrations.js';
import { MealAssessmentProjection } from '../../analysis/services/meal-assessment.projection.js';
import { NumericDailyAdherencePolicy } from '../../analysis/policies/common/numeric-daily-adherence.policy.js';
import { NutritionAnalysisService } from '../../analysis/services/nutrition-analysis.service.js';
import { NutritionCalculator } from '../../analysis/services/nutrition-calculator.js';
import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import { RecommendationService } from '../../recommendations/recommendation.service.js';
import type { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';

const AS_OF = new Date('2026-08-29T00:00:00.000Z');

function calculation(modality: DialysisModality) {
  return new NutritionTargetCalculator().calculate(
    { weightKg: 75 },
    ['ckd'],
    null,
    DialysisStatus.ACTIVE,
    'maintenance',
    null,
    AS_OF,
    modality,
    new Date('2026-08-28T00:00:00.000Z'),
  );
}

function snapshot(
  id: string,
  mealItemId: string,
  targetCalculation: ReturnType<typeof calculation>,
): MealEvaluationSnapshotSource {
  const proteinRule = targetCalculation.resolvedRules?.find(({ measurementKey }) => measurementKey === 'protein');
  if (proteinRule == null) throw new Error('Dialysis fixture requires a resolved protein rule.');
  return {
    id,
    mealItemId,
    score: 90,
    coverage: 100,
    evaluatorVersion: 'food-evaluation-v3',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '2',
    evaluatedAt: AS_OF,
    payload: {
      reasons: [],
      contributions: [{
        nutrient: 'protein',
        unit: 'g',
        amount: '40',
        targetValue: targetCalculation.targets.proteinGrams,
        currentDailyValue: null,
        explanation: 'Dialysis protein contribution.',
      }],
      evaluationStatus: 'evaluated',
      targets: targetCalculation.targets,
      deferredPolicies: targetCalculation.deferredPolicies,
      targetProvenance: targetCalculation.targetProvenance,
      resolvedRules: targetCalculation.resolvedRules,
      policySetFingerprint: 'dialysis-policy-fingerprint',
      snapshotFingerprint: `dialysis-snapshot-${id}`,
    },
  };
}

describe('dialysis completion projections', () => {
  it.each([
    [DialysisModality.HEMODIALYSIS, 'hemodialysis-protein-v1'],
    [DialysisModality.PERITONEAL_DIALYSIS, 'peritoneal-dialysis-protein-v1'],
  ] as const)('selects the %s protein target through the shared target pipeline', (modality, policyId) => {
    const result = calculation(modality);

    expect(result.targets.proteinGrams).toBe('75');
    expect(result.targetProvenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId, target: 'proteinGrams' }),
    ]));
    expect(result.resolvedRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId, measurementKey: 'protein', kind: 'lower-target' }),
    ]));
    expect(result.targetProvenance).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        policyId: policyId === 'hemodialysis-protein-v1' ? 'peritoneal-dialysis-protein-v1' : 'hemodialysis-protein-v1',
      }),
    ]));
  });

  it('defers dialysis protein guidance for unknown, conflicting, or stale modality evidence', () => {
    const calculator = new NutritionTargetCalculator();
    const base = (modality: 'UNKNOWN' | 'CONFLICTING', reportedAt: Date) => calculator.calculate(
      { weightKg: 75 },
      ['ckd'],
      null,
      DialysisStatus.ACTIVE,
      'maintenance',
      null,
      AS_OF,
      modality,
      reportedAt,
    );

    expect(base('UNKNOWN', new Date('2026-08-28T00:00:00.000Z')).deferredPolicies).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'hemodialysis-protein-v1', reason: 'missing-dialysis-modality' }),
    ]));
    expect(base('CONFLICTING', new Date('2026-08-28T00:00:00.000Z')).deferredPolicies).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'hemodialysis-protein-v1', reason: 'conflicting-dialysis-modality' }),
    ]));
    expect(base('UNKNOWN', new Date('2025-08-28T00:00:00.000Z')).deferredPolicies).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'hemodialysis-protein-v1', reason: 'missing-dialysis-modality' }),
    ]));
    expect(calculator.calculate(
      { weightKg: 75 }, ['ckd'], null, DialysisStatus.ACTIVE, 'maintenance', null, AS_OF,
      DialysisModality.HEMODIALYSIS, new Date('2025-08-28T00:00:00.000Z'),
    ).deferredPolicies).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'hemodialysis-protein-v1', reason: 'stale-dialysis-evidence' }),
    ]));
  });

  it('uses the same dialysis target in food, meal, daily adherence, recommendations, and historical replay', async () => {
    const targetCalculation = calculation(DialysisModality.HEMODIALYSIS);
    const proteinRule = targetCalculation.resolvedRules?.find(({ measurementKey }) => measurementKey === 'protein');
    if (proteinRule == null) throw new Error('Dialysis fixture requires a resolved protein rule.');

    const foodEvaluation = new FoodEvaluationEngine().evaluate({
      portionGrams: '100',
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '100' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '40' },
      ],
      targets: targetCalculation.targets,
      targetCalculation,
    });
    expect(foodEvaluation.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'protein', amount: '40', targetValue: '75' }),
    ]));
    expect(foodEvaluation.reasons).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'protein' }),
    ]));

    const projection = new MealAssessmentProjection().project({
      contributions: foodEvaluation.contributions,
      resolvedRules: [proteinRule],
    });
    expect(projection.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rule: expect.objectContaining({ policyId: 'hemodialysis-protein-v1' }),
        measuredValue: '40',
        targetValue: '75',
        status: 'contribution',
      }),
    ]));

    const sourceSnapshot = snapshot('dialysis-snapshot-1', 'dialysis-item-1', targetCalculation);
    const adherence = new NumericDailyAdherencePolicy().calculate(proteinRule, [sourceSnapshot], 1);
    expect(adherence).toMatchObject({
      status: 'available',
      consumedValue: '40',
      remainingValue: '35',
      targetValue: '75',
      policyId: 'hemodialysis-protein-v1',
      measurementKey: 'protein',
      policySetFingerprint: 'dialysis-policy-fingerprint',
    });

    const recommendations = new RecommendationService().recommend('user-1', sourceSnapshot, 'current-food');
    expect(recommendations.selected).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nutrient: 'protein',
        policy: expect.objectContaining({ policyId: 'protein-condition-target-recommendation' }),
      }),
    ]));

    const meal = {
      id: 'dialysis-meal-1',
      consumedAt: AS_OF,
      items: [{ id: 'dialysis-item-1', quantity: '1', servingGrams: '100', nutrients: [] }],
    };
    const analysis = new NutritionAnalysisService(
      { findMealsForDateRange: jest.fn().mockResolvedValue([meal]) } as never,
      new NutritionCalculator(),
      { calculateForUser: jest.fn() } as never,
      { findForUserDateRange: jest.fn().mockResolvedValue([sourceSnapshot]) } as never,
      createDailyNutritionProjectionRegistrations(),
    );
    const historical = await analysis.getHistoricalSummary('user-1', '2026-08-29');
    const day = historical.days[0];
    expect(day?.evaluationMode).toBe('historical-replay');
    expect(day?.targets.proteinGrams).toBe('75');
    expect(day?.targetProvenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'hemodialysis-protein-v1', target: 'proteinGrams' }),
    ]));
    expect(day?.mealAssessments?.[0]?.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: expect.objectContaining({ policyId: 'hemodialysis-protein-v1' }) }),
    ]));
    expect(day?.dailyAdherenceByPolicy).toEqual(expect.arrayContaining([
      expect.objectContaining({
        policyId: 'hemodialysis-protein-v1',
        consumedValue: '40',
        targetValue: '75',
        snapshotIds: ['dialysis-snapshot-1'],
      }),
    ]));
    expect(day?.snapshotIds).toEqual(['dialysis-snapshot-1']);
    expect(day?.policySetFingerprints).toEqual(['dialysis-policy-fingerprint']);
  });
});
