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

export interface FoodEvaluationSource {
  readonly score: number;
  readonly reasons: readonly FoodEvaluationReason[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
}
