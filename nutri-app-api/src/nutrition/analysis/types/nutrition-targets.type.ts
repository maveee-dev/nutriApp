export interface NutritionTargets {
  readonly sodiumMilligrams: string;
  readonly proteinGrams: string | null;
}

export interface NutritionTargetAdjustment {
  readonly target: 'sodiumMilligrams' | 'proteinGrams';
  readonly from: string;
  readonly to: string;
  readonly reasonCode: string;
  readonly explanation: string;
}

export interface NutritionTargetCalculation {
  readonly targets: NutritionTargets;
  readonly adjustments: readonly NutritionTargetAdjustment[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
}

export interface NutritionPolicyDeferralSource {
  readonly policyId: string;
  readonly reason: string;
  readonly explanation: string;
}
