import { NutritionTargetCalculator } from './nutrition-target-calculator.js';
import { DialysisStatus } from '../../../../generated/prisma/client.js';

describe('NutritionTargetCalculator', () => {
  const calculator = new NutritionTargetCalculator();

  it('derives protein from weight and keeps the baseline sodium limit', () => {
    expect(calculator.calculate({ weightKg: 75 })).toEqual({
      targets: { sodiumMilligrams: '2300', proteinGrams: '60' },
      adjustments: [],
      deferredPolicies: [],
    });
  });

  it('leaves protein unavailable without profile weight', () => {
    expect(calculator.calculate(null)).toEqual({
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      adjustments: [],
      deferredPolicies: [],
    });
    expect(calculator.calculate({ weightKg: null })).toEqual({
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      adjustments: [],
      deferredPolicies: [],
    });
  });

  it('reports deferred CKD personalization when required evidence is missing', () => {
    expect(calculator.calculate(null, ['ckd']).deferredPolicies).toEqual([{
      policyId: 'ckd-protein',
      reason: 'missing-weight',
      explanation: 'A current body weight is needed to personalize the CKD protein guidance.',
    }]);
  });

  it('preserves decimal precision for weight-derived targets', () => {
    expect(calculator.calculate({ weightKg: 72.5 }).targets.proteinGrams).toBe('58');
  });

  it('adjusts sodium for hypertension and records exact provenance', () => {
    expect(calculator.calculate({ weightKg: 75 }, ['hypertension'])).toEqual({
      targets: { sodiumMilligrams: '1500', proteinGrams: '60' },
      adjustments: [{
        target: 'sodiumMilligrams',
        from: '2300',
        to: '1500',
        reasonCode: 'hypertension-sodium-limit',
        explanation: 'Sodium target reduced from 2300 mg/day to 1500 mg/day because condition code hypertension is present. This is an MVP product policy based on the selected AHA guideline and is not individualized medical advice.',
      }],
      deferredPolicies: [],
    });
  });

  it('confirms the existing protein baseline for eligible non-dialysis CKD without a no-op adjustment', () => {
    expect(
      calculator.calculate(
        { weightKg: 75 },
        ['ckd'],
        {
          testCode: 'egfr',
          value: '45',
          unit: 'mL/min/1.73m²',
          collectedAt: new Date('2026-08-15T00:00:00.000Z'),
          status: 'reported',
          explanation: 'reported',
        },
        DialysisStatus.INACTIVE,
      ),
    ).toEqual({
      targets: { sodiumMilligrams: '2300', proteinGrams: '60' },
      adjustments: [],
      deferredPolicies: [],
    });
  });

  it('does not apply the CKD policy when dialysis status is active or unknown', () => {
    const finding = {
      testCode: 'egfr',
      value: '45',
      unit: 'mL/min/1.73m²',
      collectedAt: new Date('2026-08-15T00:00:00.000Z'),
      status: 'reported' as const,
      explanation: 'reported',
    };
    expect(calculator.calculate({ weightKg: 75 }, ['ckd'], finding, DialysisStatus.ACTIVE).adjustments).toEqual([]);
    expect(calculator.calculate({ weightKg: 75 }, ['ckd'], finding, null).adjustments).toEqual([]);
  });
});
