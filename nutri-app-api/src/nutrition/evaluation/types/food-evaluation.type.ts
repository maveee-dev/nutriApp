import { NutritionPolicyDeferralSource, NutritionTargets, NutritionTargetCalculation } from '../../analysis/types/nutrition-targets.type.js';
import { NutritionTotal } from '../../analysis/types/nutrition-total.type.js';

export interface FoodEvaluationNutrientInput {
  readonly name: string;
  readonly unit: string;
  readonly amountPer100Grams: string;
}

export interface FoodEvaluationInput {
  readonly nutrients: readonly FoodEvaluationNutrientInput[];
  readonly portionGrams: string;
  readonly targets: NutritionTargets;
  readonly targetCalculation: NutritionTargetCalculation;
  readonly currentDailyTotals?: readonly NutritionTotal[];
}

export interface FoodEvaluationReason {
  readonly code: string;
  readonly direction: 'positive' | 'negative' | 'neutral';
  readonly nutrient: string;
  readonly measuredValue: string;
  readonly targetValue: string | null;
  readonly explanation: string;
}

export interface FoodEvaluationContribution {
  readonly nutrient: string;
  /** Unit of the contribution. Optional for backward-compatible legacy snapshots. */
  readonly unit?: string;
  readonly amount: string;
  readonly targetValue: string | null;
  readonly currentDailyValue: string | null;
  readonly explanation: string;
}

export interface FoodEvaluationSource {
  readonly score: number;
  /** Additive status for distinguishing an unevaluable food from a genuine low score. */
  readonly evaluationStatus?: 'evaluated' | 'insufficient-evidence';
  readonly coverage: number;
  readonly reasons: readonly FoodEvaluationReason[];
  readonly contributions: readonly FoodEvaluationContribution[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
}

export interface FoodEvaluationWithContextSource {
  readonly evaluation: FoodEvaluationSource;
  readonly targetCalculation: NutritionTargetCalculation;
}
