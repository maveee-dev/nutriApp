import { NutritionPolicyDeferralSource } from '../types/nutrition-targets.type.js';
import { NutritionTargetCandidate, NutritionTargetPolicyOutput, NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';
import { NumericConstraintRuleDescriptor } from '../types/evaluation-rule.type.js';

export const TARGET_KEYS = {
  sodium: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
  protein: 'nutrition-target:proteinGrams:daily-lower-limit',
  saturatedFat: 'nutrition-target:saturatedFatGrams:daily-upper-limit',
  addedSugar: 'nutrition-target:addedSugarGrams:daily-upper-limit',
  cholesterol: 'nutrition-target:cholesterolMilligrams:daily-upper-limit',
  potassium: 'nutrition-target:potassiumMilligrams:daily-upper-limit',
  phosphorus: 'nutrition-target:phosphorusMilligrams:daily-upper-limit',
  fiber: 'nutrition-target:fiberGrams:daily-lower-limit',
  carbohydrate: 'nutrition-target:carbohydrateGrams:daily-target',
  calories: 'nutrition-target:caloriesKcal:daily-target',
} as const;

export function simple(
  policyId: string,
  version: string,
  evaluate: NutritionTargetPolicyRegistration['evaluate'],
  metadata: Pick<NutritionTargetPolicyRegistration, 'dependsOn' | 'precedenceByConflictKey' | 'evaluationRule'> = {},
): NutritionTargetPolicyRegistration {
  return { policyId, version, evaluate, ...metadata };
}

export function output(candidateValue?: NutritionTargetCandidate, deferredPolicies: readonly NutritionPolicyDeferralSource[] = []): NutritionTargetPolicyOutput {
  return { candidates: candidateValue == null ? [] : [candidateValue], deferredPolicies };
}

export function emptyOutput(): NutritionTargetPolicyOutput { return output(); }

export function find(candidates: readonly NutritionTargetCandidate[], target: NutritionTargetCandidate['target']): NutritionTargetCandidate | undefined {
  return candidates.find((candidate) => candidate.target === target);
}

export function candidate(
  policyId: string,
  policyVersion: string,
  target: NutritionTargetCandidate['target'],
  value: string,
  conflictKey: string,
  precedence: number,
  specificity: number,
  order: number,
  provenance?: NutritionTargetCandidate['provenance'],
  supportingProvenance?: NutritionTargetCandidate['supportingProvenance'],
  adjustment?: NutritionTargetCandidate['adjustment'],
): NutritionTargetCandidate {
  return {
    candidateId: `${policyId}:${target}`,
    target, value, conflictKey, policyId, policyVersion, precedence, specificity, order,
    ...(provenance == null ? {} : { provenance }),
    ...(supportingProvenance == null ? {} : { supportingProvenance }),
    ...(adjustment == null ? {} : { adjustment }),
  };
}
