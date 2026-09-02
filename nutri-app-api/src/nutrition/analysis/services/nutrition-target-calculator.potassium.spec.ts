import { NutritionTargetCalculator } from './nutrition-target-calculator.js';
import { createNutritionTargetPolicyRegistrations } from './nutrition-target-registrations.js';

describe('NutritionTargetCalculator potassium evidence integration', () => {
  it('resolves the shared individualized target evidence into a potassium rule', () => {
    const calculator = new NutritionTargetCalculator(createNutritionTargetPolicyRegistrations());
    const result = calculator.calculateFromContext({
      profile: { weightKg: 70 },
      conditionCodes: ['ckd'],
      energyGoal: 'maintenance',
      asOf: new Date('2026-08-22T00:00:00Z'),
      evidence: {
        diabetes: { carbohydrateTarget: null },
        renal: {
          egfrFinding: null,
          dialysisStatus: 'INACTIVE',
          dialysisModality: 'UNKNOWN',
          dialysisReportedAt: null,
          potassiumFinding: {
            testCode: 'potassium', value: '5.2', unit: 'mmol/L',
            collectedAt: new Date('2026-08-20T00:00:00Z'), status: 'reported', explanation: 'reported',
          },
        },
        'individualized-targets': {
          targets: [{
            id: 'target-1', userId: 'user-1', nutrientKey: 'potassiumMilligrams', kind: 'upper-limit',
            targetValue: '2000', unit: 'mg/day', approvalSource: 'CLINICIAN_APPROVED', sourceReference: 'care-plan-1',
            effectiveAt: new Date('2026-08-01T00:00:00Z'), approvedAt: new Date('2026-08-01T00:00:00Z'), expiresAt: null, version: 1,
          }],
        },
      },
    });

    expect(result.targets.potassiumMilligrams).toBe('2000');
    expect(result.resolvedRules).toEqual(expect.arrayContaining([expect.objectContaining({
      policyId: 'ckd-potassium-v1', kind: 'upper-limit', measurementKey: 'potassium', roles: expect.arrayContaining(['compatibility', 'contribution', 'progress']),
    })]));
    expect(result.targetProvenance).toEqual(expect.arrayContaining([expect.objectContaining({ target: 'potassiumMilligrams', policyId: 'ckd-potassium-v1' })]));
  });

  it('keeps potassium out of targets and resolved rules while exposing its informational limitation', () => {
    const calculator = new NutritionTargetCalculator(createNutritionTargetPolicyRegistrations());
    const result = calculator.calculateFromContext({
      profile: { weightKg: 70 },
      conditionCodes: ['ckd'],
      energyGoal: 'maintenance',
      asOf: new Date('2026-08-22T00:00:00Z'),
      evidence: {
        diabetes: { carbohydrateTarget: null },
        renal: {
          egfrFinding: null,
          dialysisStatus: 'ACTIVE',
          dialysisModality: 'HEMODIALYSIS',
          dialysisReportedAt: new Date('2026-08-20T00:00:00Z'),
          potassiumFinding: {
            testCode: 'potassium', value: '4.8', unit: 'mmol/L',
            collectedAt: new Date('2026-08-20T00:00:00Z'), status: 'reported', explanation: 'reported',
          },
        },
        'individualized-targets': { targets: [] },
      },
    });

    expect(result.targets.potassiumMilligrams).toBeUndefined();
    expect(result.resolvedRules?.some(({ policyId }) => policyId === 'ckd-potassium-v1')).toBe(false);
    expect(result.targetProvenance?.some(({ policyId }) => policyId === 'ckd-potassium-v1')).toBe(false);
    expect(result.deferredPolicies).toEqual(expect.arrayContaining([expect.objectContaining({
      policyId: 'ckd-potassium-v1',
      reason: 'missing-individualized-potassium-target',
    })]));
  });
});
