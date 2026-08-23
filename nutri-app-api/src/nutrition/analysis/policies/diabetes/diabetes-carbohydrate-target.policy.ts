import { CONDITION_CODES } from '../../../../conditions/types/condition-code.js';
import { DiabetesCarbohydrateTargetSource } from '../../types/diabetes-carbohydrate-target.type.js';
import { NutritionPolicyDeferralSource, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const DIABETES_CARBOHYDRATE_TARGET_POLICY_ID = 'diabetes-carbohydrate-target-v1';
export const DIABETES_CARBOHYDRATE_TARGET_POLICY_VERSION = 'v1';

const ADA_SOURCE = 'American Diabetes Association Standards of Care in Diabetes—2026, Section 5';
const ADA_SOURCE_VERSION = '2026-12-08';
const ADA_SOURCE_URL = 'https://diabetesjournals.org/care/article/49/Supplement_1/S89/163932/5-Facilitating-Positive-Health-Behaviors-and-Well';

export interface DiabetesCarbohydrateTargetPolicyResult {
  readonly carbohydrateGrams: string | null;
  readonly provenance: NutritionTargetProvenance | null;
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
}

/** Applies only an approved individualized carbohydrate target; never invents a universal diabetes target. */
export class DiabetesCarbohydrateTargetPolicy {
  calculate(
    conditionCodes: readonly string[],
    target: DiabetesCarbohydrateTargetSource | null,
    asOf: Date = new Date(),
  ): DiabetesCarbohydrateTargetPolicyResult {
    if (!conditionCodes.includes(CONDITION_CODES.DIABETES)) {
      return { carbohydrateGrams: null, provenance: null, deferredPolicy: null };
    }

    if (target == null) {
      return this.defer('missing-individualized-carbohydrate-target', 'An approved individualized carbohydrate target is required for diabetes-specific carbohydrate guidance.');
    }
    if (target.expiresAt != null && target.expiresAt <= asOf) {
      return this.defer('expired-individualized-carbohydrate-target', 'The approved individualized carbohydrate target has expired and must be reviewed before diabetes-specific guidance can continue.');
    }

    return {
      carbohydrateGrams: target.targetGrams,
      deferredPolicy: null,
      provenance: {
        target: 'carbohydrateGrams',
        policyId: DIABETES_CARBOHYDRATE_TARGET_POLICY_ID,
        source: ADA_SOURCE,
        sourceUrl: ADA_SOURCE_URL,
        sourceVersion: ADA_SOURCE_VERSION,
        guideline: {
          name: 'Standards of Care in Diabetes—2026',
          edition: '2026 edition',
          url: 'https://diabetesjournals.org/care/issue/49/Supplement_1',
        },
        evidence: {
          approvalSource: target.approvalSource,
          sourceReference: target.sourceReference,
          approvedAt: target.approvedAt.toISOString(),
          expiresAt: target.expiresAt?.toISOString() ?? null,
        },
        version: DIABETES_CARBOHYDRATE_TARGET_POLICY_VERSION,
        explanation: `This individualized carbohydrate target of ${target.targetGrams} g/day was supplied through an approved ${target.approvalSource.toLowerCase().replace('_', ' ')} target record. The ADA source governs the requirement for individualized nutrition planning; it does not provide a universal carbohydrate target.`,
      },
    };
  }

  private defer(reason: string, explanation: string): DiabetesCarbohydrateTargetPolicyResult {
    return {
      carbohydrateGrams: null,
      provenance: null,
      deferredPolicy: {
        policyId: DIABETES_CARBOHYDRATE_TARGET_POLICY_ID,
        reason,
        explanation,
      },
    };
  }
}
