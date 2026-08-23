import { NutritionTargetCalculator } from './nutrition-target-calculator.js';
import { createNutritionTargetPolicyRegistrations } from './nutrition-target-registrations.js';

describe('NutritionTargetCalculator phosphorus evidence integration', () => {
  it('resolves shared individualized phosphorus evidence into an upper-limit rule', () => {
    const calculator = new NutritionTargetCalculator(createNutritionTargetPolicyRegistrations());
    const result = calculator.calculateFromContext({
      profile: { weightKg: 70 },
      conditionCodes: ['ckd'],
      energyGoal: 'maintenance',
      asOf: new Date('2026-08-22T00:00:00Z'),
      evidence: {
        diabetes: { carbohydrateTarget: null },
        renal: {
          egfrFinding: {
            testCode: 'egfr', value: '20', unit: 'mL/min/1.73m2',
            collectedAt: new Date('2026-08-20T00:00:00Z'), status: 'reported', explanation: 'reported',
          },
          dialysisStatus: 'INACTIVE',
          dialysisModality: 'UNKNOWN',
          dialysisReportedAt: null,
          potassiumFinding: null,
          phosphorusFinding: {
            testCode: 'phosphorus', value: '4.5', unit: 'mg/dL',
            collectedAt: new Date('2026-08-20T00:00:00Z'), status: 'reported', explanation: 'reported',
          },
        },
        'individualized-targets': {
          targets: [{
            id: 'target-1', userId: 'user-1', nutrientKey: 'phosphorusMilligrams', kind: 'upper-limit',
            targetValue: '800', unit: 'mg/day', approvalSource: 'CLINICIAN_APPROVED', sourceReference: 'care-plan-1',
            effectiveAt: new Date('2026-08-01T00:00:00Z'), approvedAt: new Date('2026-08-01T00:00:00Z'), expiresAt: null, version: 1,
          }],
        },
      },
    });

    expect(result.targets.phosphorusMilligrams).toBe('800');
    expect(result.resolvedRules).toEqual(expect.arrayContaining([expect.objectContaining({
      policyId: 'ckd-phosphorus-v1', kind: 'upper-limit', measurementKey: 'phosphorus',
      roles: expect.arrayContaining(['compatibility', 'contribution', 'progress']),
    })]));
    expect(result.targetProvenance).toEqual(expect.arrayContaining([expect.objectContaining({ target: 'phosphorusMilligrams', policyId: 'ckd-phosphorus-v1' })]));
  });
});
