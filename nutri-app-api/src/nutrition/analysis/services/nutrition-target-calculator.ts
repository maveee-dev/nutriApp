import { Decimal } from 'decimal.js';
import { ProfileSource } from '../../../profiles/sources/profile.source.js';
import { LaboratoryFindingSource } from '../../../laboratory/sources/laboratory-finding.source.js';
import { NutritionTargets } from '../types/nutrition-targets.type.js';
import { NutritionPolicyDeferralSource, NutritionTargetCalculation } from '../types/nutrition-targets.type.js';
import { DialysisStatus } from '../../../../generated/prisma/client.js';
import { CkdProteinPolicy } from '../policies/ckd-protein.policy.js';
import { HypertensionSodiumPolicy } from '../policies/hypertension-sodium.policy.js';
import { CONDITION_CODES } from '../../../conditions/types/condition-code.js';

const BASELINE_SODIUM_LIMIT_MG = new Decimal(2300);
const BASELINE_PROTEIN_GRAMS_PER_KG = new Decimal('0.8');

export class NutritionTargetCalculator {
  private readonly ckdProteinPolicy = new CkdProteinPolicy();
  private readonly hypertensionSodiumPolicy = new HypertensionSodiumPolicy();

  calculate(
    profile: Pick<ProfileSource, 'weightKg'> | null,
    conditionCodes: readonly string[] = [],
    egfrFinding: LaboratoryFindingSource | null = null,
    dialysisStatus: DialysisStatus | null = null,
  ): NutritionTargetCalculation {
    const baselineSodium = BASELINE_SODIUM_LIMIT_MG.toString();
    const sodiumPolicy = this.hypertensionSodiumPolicy.calculate(
      conditionCodes,
      baselineSodium,
    );
    const baselineProtein = profile?.weightKg == null
      ? null
      : BASELINE_PROTEIN_GRAMS_PER_KG.mul(profile.weightKg).toString();
    const proteinPolicy = this.ckdProteinPolicy.calculate(
      profile,
      conditionCodes,
      egfrFinding,
      dialysisStatus,
      baselineProtein,
    );

    const targets: NutritionTargets = {
      sodiumMilligrams: sodiumPolicy.sodiumMilligrams,
      proteinGrams: proteinPolicy ?? baselineProtein,
    };
    const deferredPolicies = this.getDeferredPolicies(
      profile,
      conditionCodes,
      egfrFinding,
      dialysisStatus,
    );
    return {
      targets,
      adjustments: sodiumPolicy.adjustment ? [sodiumPolicy.adjustment] : [],
      deferredPolicies,
    };
  }

  private getDeferredPolicies(
    profile: Pick<ProfileSource, 'weightKg'> | null,
    conditionCodes: readonly string[],
    egfrFinding: LaboratoryFindingSource | null,
    dialysisStatus: DialysisStatus | null,
  ): readonly NutritionPolicyDeferralSource[] {
    if (!conditionCodes.includes(CONDITION_CODES.CKD)) return [];
    if (profile?.weightKg == null) {
      return [{
        policyId: 'ckd-protein',
        reason: 'missing-weight',
        explanation: 'A current body weight is needed to personalize the CKD protein guidance.',
      }];
    }
    if (dialysisStatus === DialysisStatus.ACTIVE) {
      return [{
        policyId: 'ckd-protein',
        reason: 'dialysis-policy-pending',
        explanation: 'Dialysis-specific protein guidance is not yet applied. Confirm your target with a renal dietitian.',
      }];
    }
    if (dialysisStatus == null) {
      return [{
        policyId: 'ckd-protein',
        reason: 'missing-dialysis-status',
        explanation: 'Dialysis status and a current eGFR result are needed for more specific CKD protein guidance.',
      }];
    }
    if (egfrFinding == null) {
      return [{
        policyId: 'ckd-protein',
        reason: 'missing-egfr',
        explanation: 'A current eGFR result is needed for more specific CKD protein guidance.',
      }];
    }
    const egfr = new Decimal(egfrFinding.value);
    if (!egfr.gt(0) || !egfr.lt(60)) {
      return [{
        policyId: 'ckd-protein',
        reason: 'unsupported-egfr',
        explanation: 'The available eGFR result does not meet the current CKD protein policy requirements.',
      }];
    }
    return [];
  }
}
