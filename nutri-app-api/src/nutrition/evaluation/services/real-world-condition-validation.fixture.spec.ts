import { ActivityLevel, DiabetesTargetApprovalSource, Sex } from '../../../../generated/prisma/client.js';
import { CANONICAL_EGFR_UNIT } from '../../../laboratory/services/egfr-interpreter.js';
import { NutritionTargetCalculator } from '../../analysis/services/nutrition-target-calculator.js';
import type { NutritionTargetCalculation } from '../../analysis/types/nutrition-targets.type.js';
import { FoodEvaluationEngine } from './food-evaluation.engine.js';

const AS_OF = new Date('2026-08-22T00:00:00.000Z');
const PROFILE = { weightKg: 75 };
const COMPLETE_PROFILE = {
  ...PROFILE,
  age: 35,
  sex: Sex.MALE,
  heightCm: 180,
  activityLevel: ActivityLevel.MODERATE,
};
const calculator = new NutritionTargetCalculator();
const evaluator = new FoodEvaluationEngine();

function egfr(value: string, collectedAt: string = '2026-08-21T00:00:00.000Z') {
  return {
    testCode: 'egfr',
    value,
    unit: CANONICAL_EGFR_UNIT,
    collectedAt: new Date(collectedAt),
    status: 'reported' as const,
    explanation: 'Deterministic validation fixture.',
  };
}

function diabetesTarget() {
  return {
    userId: 'fixture-user',
    targetGrams: '180',
    approvalSource: DiabetesTargetApprovalSource.CLINICIAN_APPROVED,
    sourceReference: 'fixture-care-plan-1',
    approvedAt: new Date('2026-08-01T00:00:00.000Z'),
    expiresAt: null,
  };
}

function evaluate(calculation: NutritionTargetCalculation, nutrients: { name: string; unit: string; amountPer100Grams: string }[]) {
  return evaluator.evaluate({
    nutrients,
    portionGrams: '100',
    targets: calculation.targets,
    targetCalculation: calculation,
  });
}

describe('real-world condition validation fixtures', () => {
  it('keeps a general user safe-food compatibility separate from adequacy contributions', () => {
    const calculation = calculator.calculate(PROFILE, [], null, null, 'maintenance', null, AS_OF);
    const result = evaluate(calculation, [
      { name: 'Sodium', unit: 'mg', amountPer100Grams: '100' },
      { name: 'Protein', unit: 'g', amountPer100Grams: '0.73' },
      { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '23' },
    ]);

    expect(result.evaluationStatus).toBe('evaluated');
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.map(({ nutrient }) => nutrient)).toEqual(['sodium']);
    expect(result.contributions.map(({ nutrient }) => nutrient)).toEqual(expect.arrayContaining(['protein', 'carbohydrates']));
    expect(calculation.targetProvenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'general-nutrition-sodium-v1' }),
    ]));
  });

  it('changes compatibility for a hypertension sodium violation without changing contribution semantics', () => {
    const calculation = calculator.calculate(COMPLETE_PROFILE, ['hypertension'], null, null, 'maintenance', null, AS_OF);
    const compliant = evaluate(calculation, [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '100' }, { name: 'Protein', unit: 'g', amountPer100Grams: '20' }]);
    const excessive = evaluate(calculation, [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '1600' }, { name: 'Protein', unit: 'g', amountPer100Grams: '20' }]);

    expect(calculation.targets.sodiumMilligrams).toBe('1500');
    expect(compliant.score).toBeGreaterThan(0);
    expect(excessive.score).toBeLessThan(compliant.score);
    expect(excessive.reasons).toEqual(expect.arrayContaining([expect.objectContaining({ nutrient: 'sodium', direction: 'negative' })]));
    expect(excessive.contributions).toEqual(expect.arrayContaining([expect.objectContaining({ nutrient: 'protein', amount: '20' })]));
  });

  it('defers individualized diabetes guidance when the approved carbohydrate target is absent', () => {
    const calculation = calculator.calculate(PROFILE, ['diabetes'], null, null, 'maintenance', null, AS_OF);
    const result = evaluate(calculation, [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '0' }, { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '90' }]);

    expect(calculation.targets.carbohydrateGrams).toBeUndefined();
    expect(calculation.deferredPolicies).toContainEqual(expect.objectContaining({
      policyId: 'diabetes-carbohydrate-target-v1',
      reason: 'missing-individualized-carbohydrate-target',
    }));
    expect(result.deferredPolicies).toEqual(calculation.deferredPolicies);
    expect(result.contributions).toEqual(expect.arrayContaining([expect.objectContaining({ nutrient: 'carbohydrates', targetValue: null })]));
    expect(result.reasons.map(({ nutrient }) => nutrient)).not.toContain('carbohydrates');
  });

  it('applies diabetes carbohydrate evidence only as contribution while preserving combined CKD and hypertension targets', () => {
    const calculation = calculator.calculate(
      COMPLETE_PROFILE,
      ['diabetes', 'ckd', 'hypertension'],
      egfr('45'),
      'INACTIVE',
      'maintenance',
      diabetesTarget(),
      AS_OF,
    );
    const result = evaluate(calculation, [
      { name: 'Sodium', unit: 'mg', amountPer100Grams: '100' },
      { name: 'Protein', unit: 'g', amountPer100Grams: '0.73' },
      { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '90' },
    ]);

    expect(calculation.targets).toMatchObject({ sodiumMilligrams: '1500', proteinGrams: '60', carbohydrateGrams: '180' });
    expect(calculation.deferredPolicies).toEqual([{
      policyId: 'ckd-phosphorus-v1',
      reason: 'missing-individualized-phosphorus-target',
      explanation: 'An approved individualized phosphorus limit is required before CKD-specific phosphorus guidance can be applied.',
    }]);
    expect(calculation.targetProvenance.map(({ policyId }) => policyId)).toEqual(expect.arrayContaining([
      'cardiovascular-sodium-v1',
      'ckd-non-dialysis-protein-v1',
      'diabetes-carbohydrate-target-v1',
    ]));
    expect(result.evaluationStatus).toBe('evaluated');
    expect(result.reasons.map(({ nutrient }) => nutrient)).not.toEqual(expect.arrayContaining(['protein', 'carbohydrates']));
    expect(result.contributions.map(({ nutrient }) => nutrient)).toEqual(expect.arrayContaining(['protein', 'carbohydrates']));
  });

  it.each([
    ['missing', null, 'missing-egfr'],
    ['stale', egfr('20', '2025-08-20T00:00:00.000Z'), 'stale-egfr'],
  ] as const)('defers non-dialysis CKD protein guidance for %s eGFR evidence', (_label, finding, reason) => {
    const calculation = calculator.calculate(PROFILE, ['ckd'], finding, 'INACTIVE', 'maintenance', null, AS_OF);

    expect(calculation.targets.proteinGrams).toBe('60');
    expect(calculation.deferredPolicies).toContainEqual(expect.objectContaining({
      policyId: 'ckd-non-dialysis-protein-v1',
      reason,
    }));
    expect(calculation.targetProvenance.map(({ policyId }) => policyId)).not.toContain('ckd-non-dialysis-protein-v1');
  });

  it('keeps hemodialysis and peritoneal dialysis independent', () => {
    const hemodialysis = calculator.calculate(PROFILE, ['ckd'], null, 'ACTIVE', 'maintenance', null, AS_OF, 'HEMODIALYSIS', new Date('2026-08-20T00:00:00.000Z'));
    const peritoneal = calculator.calculate(PROFILE, ['ckd'], null, 'ACTIVE', 'maintenance', null, AS_OF, 'PERITONEAL_DIALYSIS', new Date('2026-08-20T00:00:00.000Z'));

    expect(hemodialysis.targets.proteinGrams).toBe('75');
    expect(hemodialysis.targetProvenance).toEqual(expect.arrayContaining([expect.objectContaining({ policyId: 'hemodialysis-protein-v1' })]));
    expect(peritoneal.targets.proteinGrams).toBe('75');
    expect(peritoneal.targetProvenance).toEqual(expect.arrayContaining([expect.objectContaining({ policyId: 'peritoneal-dialysis-protein-v1' })]));
    expect(peritoneal.targetProvenance).not.toEqual(expect.arrayContaining([expect.objectContaining({ policyId: 'hemodialysis-protein-v1' })]));
  });

  it('does not infer approval for conflicting dialysis modality evidence', () => {
    const calculation = calculator.calculate(PROFILE, ['ckd'], null, 'ACTIVE', 'maintenance', null, AS_OF, 'CONFLICTING', new Date('2026-08-20T00:00:00.000Z'));

    expect(calculation.targetProvenance.map(({ policyId }) => policyId)).not.toEqual(expect.arrayContaining([
      'hemodialysis-protein-v1',
      'peritoneal-dialysis-protein-v1',
      'ckd-non-dialysis-protein-v1',
    ]));
    expect(calculation.deferredPolicies).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'hemodialysis-protein-v1', reason: 'conflicting-dialysis-modality' }),
    ]));
  });

  it('preserves an invalid eGFR unit as an explicit CKD deferral', () => {
    const calculation = calculator.calculateFromContext({
      profile: PROFILE,
      conditionCodes: ['ckd'],
      energyGoal: 'maintenance',
      asOf: AS_OF,
      evidence: {
        diabetes: { carbohydrateTarget: null },
        renal: {
          egfrFinding: null,
          egfrFailureReason: 'invalid-egfr-unit',
          egfrFailureExplanation: 'The fixture eGFR unit is unsupported.',
          dialysisStatus: 'INACTIVE',
          dialysisModality: null,
          dialysisReportedAt: null,
        },
      },
    });

    expect(calculation.deferredPolicies).toContainEqual(expect.objectContaining({
      policyId: 'ckd-non-dialysis-protein-v1',
      reason: 'invalid-egfr-unit',
    }));
  });

  it('does not claim unsupported condition ownership', () => {
    const calculation = calculator.calculate(PROFILE, ['hyperlipidemia', 'gout', 'anemia'], null, null, 'maintenance', null, AS_OF);
    const policyIds = calculation.targetProvenance.map(({ policyId }) => policyId);

    expect(policyIds).not.toEqual(expect.arrayContaining(['hyperlipidemia', 'gout', 'anemia']));
    expect(calculation.deferredPolicies).toEqual([]);
  });
});
