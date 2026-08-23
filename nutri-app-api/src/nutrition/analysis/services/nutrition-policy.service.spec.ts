import { NutritionTargetCalculator } from './nutrition-target-calculator.js';
import { NutritionPolicyService } from './nutrition-policy.service.js';

describe('NutritionPolicyService', () => {
  it('loads user evidence and delegates target calculation to the policy coordinator', async () => {
    const calculator = {
      calculate: (profile: unknown, conditionCodes: readonly string[], egfr: unknown, dialysis: unknown) => {
        expect(profile).toEqual({ weightKg: '80' });
        expect(conditionCodes).toEqual(['hypertension']);
        expect(egfr).toEqual({ value: '55' });
        expect(dialysis).toBe('INACTIVE');
        return {
          targets: { sodiumMilligrams: '1500', proteinGrams: '64' },
          adjustments: [],
          deferredPolicies: [],
        };
      },
    } as unknown as NutritionTargetCalculator;
    const service = new NutritionPolicyService(
      { getMyProfile: async () => ({ weightKg: '80' }) } as any,
      { findUserConditions: async () => [{ condition: { code: 'hypertension' } }] } as any,
      calculator,
      [
        { key: 'renal', load: async () => ({ egfrFinding: { value: '55' }, dialysisStatus: 'INACTIVE', dialysisModality: null, dialysisReportedAt: null }) },
        { key: 'diabetes', load: async () => ({ carbohydrateTarget: null }) },
      ] as any,
    );

    await expect(service.calculateForUser('user-1')).resolves.toEqual({
      targets: { sodiumMilligrams: '1500', proteinGrams: '64' },
      adjustments: [],
      deferredPolicies: [],
    });
  });
});
