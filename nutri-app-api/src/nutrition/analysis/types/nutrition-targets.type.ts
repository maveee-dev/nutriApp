export interface NutritionTargets {
  readonly sodiumMilligrams: string;
  readonly proteinGrams: string | null;
  readonly saturatedFatGrams?: string | null;
  readonly addedSugarGrams?: string | null;
  readonly cholesterolMilligrams?: string | null;
  readonly fiberGrams?: string | null;
  readonly carbohydrateGrams?: string | null;
  /** Set only when an approved policy supplies a potassium constraint. */
  readonly potassiumMilligrams?: string | null;
  /** Set only when an approved policy supplies a phosphorus constraint. */
  readonly phosphorusMilligrams?: string | null;
  readonly caloriesKcal?: string | null;
}

export interface NutritionTargetProvenance {
  readonly target: 'sodiumMilligrams' | 'proteinGrams' | 'saturatedFatGrams' | 'addedSugarGrams' | 'cholesterolMilligrams' | 'fiberGrams' | 'carbohydrateGrams' | 'potassiumMilligrams' | 'phosphorusMilligrams' | 'caloriesKcal';
  readonly policyId: string;
  readonly source: string;
  readonly sourceUrl?: string;
  readonly sourceVersion?: string;
  readonly guideline?: {
    readonly name: string;
    readonly edition: string;
    readonly url: string;
  };
  readonly applicability?: {
    readonly context: string;
    readonly conditionCode: string;
    readonly dialysisStatus: string | null;
    readonly laboratory?: {
      readonly testCode: string;
      readonly value: string;
      readonly unit: string;
      readonly collectedAt: string;
    };
    readonly supportingSource?: {
      readonly name: string;
      readonly version: string;
      readonly url: string;
    };
  };
  readonly evidence?: {
    readonly evidenceId?: string;
    readonly evidenceVersion?: number;
    readonly approvalSource: string;
    readonly sourceReference: string | null;
    readonly effectiveAt?: string;
    readonly approvedAt: string;
    readonly expiresAt: string | null;
  };
  readonly version: string;
  readonly explanation: string;
}

export interface NutritionTargetAdjustment {
  readonly target: 'sodiumMilligrams' | 'proteinGrams' | 'saturatedFatGrams';
  readonly from: string;
  readonly to: string;
  readonly reasonCode: string;
  readonly explanation: string;
  readonly policyId?: string;
  readonly policyVersion?: string;
  readonly conflictKey?: string;
  readonly precedence?: string;
  readonly provenance?: NutritionTargetProvenance;
  readonly supportingProvenance?: readonly NutritionTargetProvenance[];
}

import { NumericConstraintRule } from './evaluation-rule.type.js';

export interface NutritionTargetCalculation {
  readonly targets: NutritionTargets;
  readonly adjustments: readonly NutritionTargetAdjustment[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
  readonly targetProvenance?: readonly NutritionTargetProvenance[];
  /** Resolved policy semantics for downstream scope-specific projections. */
  readonly resolvedRules?: readonly NumericConstraintRule[];
  readonly energyGoal?: EnergyGoal;
}

export interface NutritionPolicyDeferralSource {
  readonly policyId: string;
  readonly reason: string;
  readonly explanation: string;
  readonly conflictKey?: string;
  readonly precedence?: number;
}
import { EnergyGoal } from '../policies/common/energy.policy.js';
