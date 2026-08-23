import { NumericConstraintRule } from './evaluation-rule.type.js';
import { NutritionPolicyDeferralSource } from './nutrition-targets.type.js';
import { FoodEvaluationContribution, FoodEvaluationReason } from '../../evaluation/types/food-evaluation.type.js';

export type MealAssessmentStatus = 'evaluated' | 'insufficient-evidence' | 'not-applicable';
export type MealAssessmentRuleStatus = 'within-limit' | 'exceeded' | 'contribution' | 'insufficient-evidence';
export type MealAssessmentLimitationCode =
  | 'missing-current-evidence'
  | 'missing-historical-evidence'
  | 'missing-resolved-rules'
  | 'missing-replay-fingerprint'
  | 'mixed-evaluator-versions'
  | 'mixed-policy-set-fingerprints'
  | 'mixed-resolved-rules'
  | 'missing-contribution-unit'
  | 'unit-mismatch'
  | 'unsupported-rule-kind';

export interface MealAssessmentLimitation {
  readonly code: MealAssessmentLimitationCode;
  readonly explanation: string;
  readonly snapshotIds?: readonly string[];
  readonly evaluatorVersions?: readonly string[];
  readonly policySetFingerprints?: readonly string[];
}

export interface MealAssessmentRuleResult {
  readonly rule: NumericConstraintRule;
  readonly measuredValue: string | null;
  readonly targetValue: string;
  readonly percentageOfTarget: number | null;
  readonly status: MealAssessmentRuleStatus;
  readonly direction: 'positive' | 'negative' | 'neutral' | null;
  readonly explanation: string;
  readonly limitationCode?: MealAssessmentLimitationCode;
}

export interface MealAssessmentSource {
  readonly status: MealAssessmentStatus;
  readonly coverage: number;
  readonly contributions: readonly FoodEvaluationContribution[];
  readonly rules: readonly MealAssessmentRuleResult[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
  readonly limitations: readonly MealAssessmentLimitation[];
  readonly snapshotIds?: readonly string[];
  readonly evaluatorVersion?: string;
  readonly policySetFingerprint?: string;
  readonly evaluationFingerprint?: string;
}

export interface MealAssessmentInput {
  readonly contributions?: readonly FoodEvaluationContribution[];
  /** Existing food-level safety outputs for rules not represented as contributions. */
  readonly compatibilityReasons?: readonly FoodEvaluationReason[];
  readonly resolvedRules: readonly NumericConstraintRule[];
  readonly deferredPolicies?: readonly NutritionPolicyDeferralSource[];
  readonly limitations?: readonly MealAssessmentLimitation[];
  readonly snapshotIds?: readonly string[];
  readonly evaluatorVersion?: string;
  readonly policySetFingerprint?: string;
  readonly evaluationFingerprint?: string;
}

/** Caller-owned grouping metadata for daily projections. */
export interface DailyMealAssessmentSource extends MealAssessmentSource {
  readonly mealId: string;
}
