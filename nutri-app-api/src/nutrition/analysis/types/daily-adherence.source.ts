import type { NutritionPolicyDeferralSource, NutritionTargetProvenance } from './nutrition-targets.type.js';

/**
 * Generic daily-adherence projection data consumed by downstream features.
 * Policy-specific projections may continue to expose their legacy fields;
 * downstream consumers use this neutral shape instead of condition names.
 */
export interface DailyAdherenceSource {
  readonly status: 'not-applicable' | 'available' | 'deferred';
  readonly targetValue: string | null;
  readonly consumedValue: string | null;
  readonly remainingValue: string | null;
  readonly exceededValue: string | null;
  readonly coveragePercentage: number | null;
  readonly targetProvenance: NutritionTargetProvenance | null;
  readonly snapshotIds: readonly string[];
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
  readonly evaluatorVersion?: string;
  readonly policySetFingerprint?: string | null;
  readonly evaluationFingerprint?: string;
}

export interface DailyAdherenceByPolicySource extends DailyAdherenceSource {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly target: string;
  readonly measurementKey: string;
  readonly ruleKind: 'upper-limit' | 'lower-target' | 'recommended-range';
}
