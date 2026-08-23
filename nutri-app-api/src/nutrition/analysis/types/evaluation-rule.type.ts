import { NutritionTargetKey } from './nutrition-target-policy.type.js';
import type { NutritionTargetProvenance } from './nutrition-targets.type.js';

export type NumericConstraintKind = 'upper-limit' | 'lower-target' | 'recommended-range';
export type EvaluationRuleRole = 'compatibility' | 'contribution' | 'progress';
export type EvaluationRuleScope = 'food' | 'meal' | 'daily';

export interface NumericConstraintRuleDescriptor {
  readonly family: 'numeric-constraint';
  readonly kind: NumericConstraintKind;
  readonly roles: readonly EvaluationRuleRole[];
  readonly scopes: readonly EvaluationRuleScope[];
  readonly measurementKey: string;
  readonly unit: string;
  readonly weight: number;
}

export interface NumericConstraintRule extends NumericConstraintRuleDescriptor {
  readonly target: NutritionTargetKey;
  readonly targetValue: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly conflictKey: string;
  readonly precedence: number;
  readonly provenance?: NutritionTargetProvenance;
  readonly supportingProvenance?: readonly NutritionTargetProvenance[];
}

export function validateNumericConstraintDescriptor(descriptor: NumericConstraintRuleDescriptor): void {
  if (descriptor.family !== 'numeric-constraint') throw new Error('Unsupported evaluation rule family.');
  if (descriptor.weight <= 0 || !Number.isFinite(descriptor.weight)) throw new Error('Numeric evaluation rule weight must be positive and finite.');
  if (descriptor.roles.length === 0 || descriptor.scopes.length === 0) throw new Error('Numeric evaluation rules must declare at least one role and scope.');
  if (descriptor.kind === 'lower-target' && descriptor.roles.includes('compatibility')) {
    throw new Error('A lower-target rule cannot be registered for food compatibility.');
  }
}
