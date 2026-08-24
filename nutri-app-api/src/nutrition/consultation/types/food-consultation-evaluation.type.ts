import type { FoodEvaluationSource } from '../../evaluation/types/food-evaluation.type.js';
import type {
  NutritionTargetAdjustment,
  NutritionTargetProvenance,
  NutritionTargets,
  NutritionPolicyDeferralSource,
} from '../../analysis/types/nutrition-targets.type.js';

/**
 * The deterministic food evidence attached to a consultation response.
 *
 * This is deliberately a projection of existing evaluation output. It does
 * not define another calculation contract and it does not contain any
 * consultation-specific clinical reasoning.
 */
export interface FoodConsultationEvaluation {
  readonly foodId: string;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly serving: {
    readonly id: string;
    readonly name: string;
    readonly grams: string;
    readonly quantity: string;
  };
  readonly evaluation: FoodEvaluationSource;
  readonly targetCalculation: {
    readonly targets: NutritionTargets;
    readonly adjustments: readonly NutritionTargetAdjustment[];
    readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
    readonly targetProvenance?: readonly NutritionTargetProvenance[];
  };
  readonly policySetFingerprint: string | null;
}
