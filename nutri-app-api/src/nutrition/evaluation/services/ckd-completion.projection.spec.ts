import { jest } from '@jest/globals';
import { NutritionTargetCalculator } from '../../analysis/services/nutrition-target-calculator.js';
import { createNutritionTargetPolicyRegistrations } from '../../analysis/services/nutrition-target-registrations.js';
import { NumericDailyAdherencePolicy } from '../../analysis/policies/common/numeric-daily-adherence.policy.js';
import { MealAssessmentProjection } from '../../analysis/services/meal-assessment.projection.js';
import { NutritionAnalysisService } from '../../analysis/services/nutrition-analysis.service.js';
import { NutritionCalculator } from '../../analysis/services/nutrition-calculator.js';
import type { NutritionTargetCalculation } from '../../analysis/types/nutrition-targets.type.js';
import type { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import { RecommendationService } from '../../recommendations/recommendation.service.js';
import { NutritionConsultationService } from '../../consultation/services/nutrition-consultation.service.js';

const AS_OF = new Date('2026-08-22T00:00:00.000Z');
const PROFILE = { weightKg: 70 };

function finding(testCode: string, value: string, unit: string) {
  return {
    testCode,
    value,
    unit,
    collectedAt: new Date('2026-08-20T00:00:00.000Z'),
    status: 'reported' as const,
    explanation: 'CKD completion fixture.',
  };
}

function target(id: string, nutrientKey: string, targetValue: string) {
  return {
    id,
    userId: 'user-1',
    nutrientKey,
    kind: 'upper-limit' as const,
    targetValue,
    unit: 'mg/day',
    approvalSource: 'CLINICIAN_APPROVED',
    sourceReference: `care-plan-${nutrientKey}`,
    effectiveAt: new Date('2026-08-01T00:00:00.000Z'),
    approvedAt: new Date('2026-08-01T00:00:00.000Z'),
    expiresAt: null,
    version: 1,
  };
}

function activeCkdCalculation(): NutritionTargetCalculation {
  return new NutritionTargetCalculator(createNutritionTargetPolicyRegistrations()).calculateFromContext({
    profile: PROFILE,
    conditionCodes: ['ckd'],
    energyGoal: 'maintenance',
    asOf: AS_OF,
    evidence: {
      diabetes: { carbohydrateTarget: null },
      renal: {
        egfrFinding: finding('egfr', '20', 'mL/min/1.73m2'),
        dialysisStatus: 'INACTIVE',
        dialysisModality: 'UNKNOWN',
        dialysisReportedAt: null,
        potassiumFinding: finding('potassium', '5.2', 'mmol/L'),
        phosphorusFinding: finding('phosphorus', '4.5', 'mg/dL'),
      },
      'individualized-targets': {
        targets: [
          target('potassium-target-1', 'potassiumMilligrams', '2000'),
          target('phosphorus-target-1', 'phosphorusMilligrams', '800'),
        ],
      },
    },
  });
}

function contribution(nutrient: string, unit: string, amount: string, targetValue: string | null) {
  return {
    nutrient,
    unit,
    amount,
    targetValue,
    currentDailyValue: null,
    explanation: `CKD ${nutrient} contribution.`,
  };
}

function snapshot(
  id: string,
  mealItemId: string,
  calculation: NutritionTargetCalculation,
  contributions: readonly ReturnType<typeof contribution>[],
  evaluatedAt: string,
  reasons: readonly Record<string, unknown>[] = [],
): MealEvaluationSnapshotSource {
  return {
    id,
    mealItemId,
    score: 50,
    coverage: 100,
    payload: {
      reasons,
      contributions,
      evaluationStatus: 'evaluated',
      targets: calculation.targets,
      deferredPolicies: [],
      targetProvenance: calculation.targetProvenance,
      resolvedRules: calculation.resolvedRules,
      policySetFingerprint: 'ckd-policy-set-v1',
      snapshotFingerprint: `snapshot-${id}`,
    },
    evaluatorVersion: 'food-evaluation-v3',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '2',
    evaluatedAt: new Date(evaluatedAt),
  };
}

describe('CKD completion projections', () => {
  it('resolves CKD targets and projects potassium and phosphorus from the same food values', () => {
    const calculation = activeCkdCalculation();
    const rules = calculation.resolvedRules ?? [];
    const evaluator = new FoodEvaluationEngine();
    const evaluation = evaluator.evaluate({
      portionGrams: '100',
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '100' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '10' },
        { name: 'Potassium', unit: 'mg', amountPer100Grams: '1200' },
        { name: 'Phosphorus', unit: 'mg', amountPer100Grams: '900' },
      ],
      targets: calculation.targets,
      targetCalculation: calculation,
    });

    expect(calculation.targets).toMatchObject({
      proteinGrams: '56',
      potassiumMilligrams: '2000',
      phosphorusMilligrams: '800',
    });
    expect(calculation.targetProvenance?.map(({ policyId }) => policyId)).toEqual(expect.arrayContaining([
      'ckd-non-dialysis-protein-v1',
      'ckd-potassium-v1',
      'ckd-phosphorus-v1',
    ]));
    expect(rules.map(({ policyId }) => policyId)).toEqual(expect.arrayContaining([
      'ckd-potassium-v1',
      'ckd-phosphorus-v1',
    ]));
    expect(evaluation.reasons.map(({ nutrient }) => nutrient)).toEqual(expect.arrayContaining(['potassium', 'phosphorus']));
    expect(evaluation.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'potassium', unit: 'mg', amount: '1200', targetValue: '2000' }),
      expect.objectContaining({ nutrient: 'phosphorus', unit: 'mg', amount: '900', targetValue: '800' }),
      expect.objectContaining({ nutrient: 'protein', unit: 'g', amount: '10', targetValue: '56' }),
    ]));

    const meal = new MealAssessmentProjection().project({
      contributions: evaluation.contributions,
      resolvedRules: rules,
      deferredPolicies: calculation.deferredPolicies,
    });
    expect(meal.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: expect.objectContaining({ measurementKey: 'potassium' }), measuredValue: '1200' }),
      expect.objectContaining({ rule: expect.objectContaining({ measurementKey: 'phosphorus' }), measuredValue: '900', status: 'exceeded' }),
    ]));
  });

  it('aggregates active CKD upper limits through generic daily adherence', () => {
    const calculation = activeCkdCalculation();
    const rules = (calculation.resolvedRules ?? []).filter(({ measurementKey }) => ['potassium', 'phosphorus'].includes(measurementKey));
    const snapshots = [
      snapshot('ckd-item-1', 'item-1', calculation, [contribution('potassium', 'mg', '1000', '2000'), contribution('phosphorus', 'mg', '300', '800')], '2026-08-22T08:00:00.000Z'),
      snapshot('ckd-item-2', 'item-2', calculation, [contribution('potassium', 'mg', '1200', '2000'), contribution('phosphorus', 'mg', '400', '800')], '2026-08-22T12:00:00.000Z'),
    ];
    const adherence = new NumericDailyAdherencePolicy();

    expect(adherence.calculate(rules.find(({ measurementKey }) => measurementKey === 'potassium')!, snapshots, 2)).toMatchObject({
      status: 'available',
      targetValue: '2000',
      consumedValue: '2200',
      exceededValue: '200',
      coveragePercentage: 100,
      snapshotIds: ['ckd-item-1', 'ckd-item-2'],
      policyId: 'ckd-potassium-v1',
      policySetFingerprint: 'ckd-policy-set-v1',
    });
    expect(adherence.calculate(rules.find(({ measurementKey }) => measurementKey === 'phosphorus')!, snapshots, 2)).toMatchObject({
      status: 'available',
      targetValue: '800',
      consumedValue: '700',
      exceededValue: '0',
      policyId: 'ckd-phosphorus-v1',
    });
  });

  it('keeps CKD provenance and daily projections available to recommendation and consultation consumers', async () => {
    const calculation = activeCkdCalculation();
    const snapshots = [snapshot('ckd-item-1', 'item-1', calculation, [contribution('potassium', 'mg', '2200', '2000'), contribution('phosphorus', 'mg', '900', '800')], '2026-08-22T12:00:00.000Z', [
      { code: 'potassium-above-target', direction: 'negative', nutrient: 'potassium', measuredValue: '2200', targetValue: '2000', explanation: 'Potassium exceeds the target.' },
      { code: 'phosphorus-above-target', direction: 'negative', nutrient: 'phosphorus', measuredValue: '900', targetValue: '800', explanation: 'Phosphorus exceeds the target.' },
    ])];
    const recommendation = new RecommendationService().recommend('user-1', snapshots[0]);
    expect(recommendation.selected.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'potassium-condition-target-recommendation-caution',
      'phosphorus-condition-target-recommendation-caution',
    ]));
    expect(recommendation.evaluation).toMatchObject({
      snapshotIds: ['ckd-item-1'],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['ckd-policy-set-v1'],
    });

    const summary = {
      date: '2026-08-22',
      mealCount: 1,
      totals: [
        { name: 'Potassium', unit: 'mg', amount: '2200' },
        { name: 'Phosphorus', unit: 'mg', amount: '900' },
      ],
      targets: calculation.targets,
      insights: [],
      deferredPolicies: calculation.deferredPolicies,
      caloriesConsumedKcal: '0',
      remainingCaloriesKcal: null,
      calorieTargetPercentage: null,
      targetProvenance: calculation.targetProvenance,
      dailyAdherenceByPolicy: [],
      snapshotIds: ['ckd-item-1'],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['ckd-policy-set-v1'],
      snapshotFingerprints: ['snapshot-ckd-item-1'],
    };
    const consultation = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      new RecommendationService(),
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      { resolve: jest.fn() } as never,
    );
    const response = await consultation.consult('user-1', 'What foods should I choose?', '2026-08-22');
    expect(response.recommendations.evaluation).toMatchObject({
      snapshotIds: ['ckd-item-1'],
      policySetFingerprints: ['ckd-policy-set-v1'],
      targetProvenance: expect.arrayContaining([
        expect.objectContaining({ policyId: 'ckd-potassium-v1' }),
        expect.objectContaining({ policyId: 'ckd-phosphorus-v1' }),
      ]),
    });
  });

  it('replays CKD targets and nutrient totals from immutable snapshots without current policy resolution', async () => {
    const calculation = activeCkdCalculation();
    const historical = [snapshot('ckd-history-1', 'item-1', calculation, [contribution('potassium', 'mg', '1000', '2000'), contribution('phosphorus', 'mg', '400', '800')], '2026-08-20T12:00:00.000Z')];
    const calculateForUser = jest.fn();
    const service = new NutritionAnalysisService(
      { findMealsForDateRange: jest.fn().mockResolvedValue([{
        id: 'meal-1',
        consumedAt: new Date('2026-08-20T12:00:00.000Z'),
        items: [{ id: 'item-1', quantity: '1', servingGrams: '100', nutrients: [] }],
      }]) } as never,
      new NutritionCalculator(),
      { calculateForUser } as never,
      { findForUserDateRange: jest.fn().mockResolvedValue(historical) } as never,
      [],
    );

    const result = await service.getHistoricalSummary('user-1', '2026-08-20');
    expect(calculateForUser).not.toHaveBeenCalled();
    expect(result.days[0]).toMatchObject({
      evaluationMode: 'historical-replay',
      targets: calculation.targets,
      totals: [
        { name: 'phosphorus', unit: 'mg', amount: '400' },
        { name: 'potassium', unit: 'mg', amount: '1000' },
      ],
      snapshotIds: ['ckd-history-1'],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['ckd-policy-set-v1'],
      snapshotFingerprints: ['snapshot-ckd-history-1'],
    });
  });
});
