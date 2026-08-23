import type { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import type { DailyAdherenceSource } from '../../analysis/types/daily-adherence.source.js';
import type { DiabetesCarbohydrateAdherenceResult } from '../../analysis/policies/diabetes/diabetes-carbohydrate-adherence.policy.js';

const DIABETES_CARBOHYDRATE_TARGET_POLICY_ID = 'diabetes-carbohydrate-target-v1';

/**
 * Reads the generic daily-adherence projection first. The legacy Diabetes
 * field remains a compatibility fallback for older callers and snapshots.
 */
export function diabetesCarbohydrateAdherence(summary: DailyNutritionSummarySource): DiabetesCarbohydrateAdherenceResult | undefined {
  const generic = summary.dailyAdherence;
  if (generic != null && isDiabetesProjection(generic)) return fromGeneric(generic);
  return summary.diabetesCarbohydrateAdherence;
}

function isDiabetesProjection(source: DailyAdherenceSource): boolean {
  return source.targetProvenance?.policyId === DIABETES_CARBOHYDRATE_TARGET_POLICY_ID
    || source.targetValue != null && source.snapshotIds.length > 0 && source.deferredPolicy?.policyId === 'diabetes-carbohydrate-adherence-v1';
}

function fromGeneric(source: DailyAdherenceSource): DiabetesCarbohydrateAdherenceResult {
  return {
    status: source.status,
    targetCarbohydrateGrams: source.targetValue,
    consumedCarbohydrateGrams: source.consumedValue,
    remainingCarbohydrateGrams: source.remainingValue,
    exceededByGrams: source.exceededValue,
    coveragePercentage: source.coveragePercentage,
    targetProvenance: source.targetProvenance,
    snapshotIds: [...source.snapshotIds],
    deferredPolicy: source.deferredPolicy,
  };
}
