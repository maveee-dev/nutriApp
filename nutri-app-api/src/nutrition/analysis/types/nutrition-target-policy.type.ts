import { NutritionEvaluationContext } from './nutrition-evaluation-context.type.js';
import { NutritionPolicyDeferralSource, NutritionTargetAdjustment, NutritionTargetProvenance, NutritionTargets } from './nutrition-targets.type.js';
import { NumericConstraintRuleDescriptor } from './evaluation-rule.type.js';

export type NutritionTargetKey = keyof NutritionTargets;

export type NutritionTargetPolicyContext = NutritionEvaluationContext & {
  readonly baselineProteinGrams: string | null;
};

export interface NutritionTargetCandidate {
  readonly candidateId: string;
  readonly target: NutritionTargetKey;
  readonly value: string;
  readonly conflictKey: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly precedence: number;
  readonly specificity: number;
  readonly order: number;
  readonly provenance?: NutritionTargetProvenance;
  readonly supportingProvenance?: readonly NutritionTargetProvenance[];
  readonly adjustment?: NutritionTargetAdjustment;
}

export interface NutritionTargetPolicyOutput {
  readonly candidates: readonly NutritionTargetCandidate[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
}

export interface NutritionTargetPolicyRegistration {
  readonly policyId: string;
  readonly version: string;
  readonly dependsOn?: readonly string[];
  readonly precedenceByConflictKey?: Readonly<Record<string, number>>;
  /** Static semantics for the optional resolved-rule shadow path. */
  readonly evaluationRule?: NumericConstraintRuleDescriptor;
  readonly evaluate: (
    context: NutritionTargetPolicyContext,
    candidates: readonly NutritionTargetCandidate[],
  ) => NutritionTargetPolicyOutput;
}
