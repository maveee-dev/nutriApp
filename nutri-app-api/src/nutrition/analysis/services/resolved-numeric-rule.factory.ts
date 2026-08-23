import { NumericConstraintRule, validateNumericConstraintDescriptor } from '../types/evaluation-rule.type.js';
import { NutritionTargetCandidate, NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';

/** Builds dynamic rule values from a policy's static registration semantics. */
export class ResolvedNumericRuleFactory {
  create(candidate: NutritionTargetCandidate, registration: NutritionTargetPolicyRegistration): NumericConstraintRule | null {
    const descriptor = registration.evaluationRule;
    if (descriptor == null) return null;
    validateNumericConstraintDescriptor(descriptor);
    if (candidate.policyId !== registration.policyId || candidate.policyVersion !== registration.version) {
      throw new Error(`Cannot resolve an evaluation rule from mismatched policy metadata: ${registration.policyId}.`);
    }
    return {
      ...descriptor,
      target: candidate.target,
      targetValue: candidate.value,
      policyId: candidate.policyId,
      policyVersion: candidate.policyVersion,
      conflictKey: candidate.conflictKey,
      precedence: candidate.precedence,
      ...(candidate.provenance == null ? {} : { provenance: candidate.provenance }),
      ...(candidate.supportingProvenance == null ? {} : { supportingProvenance: candidate.supportingProvenance }),
    };
  }
}
