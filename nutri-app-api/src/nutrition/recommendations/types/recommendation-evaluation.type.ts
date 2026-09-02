import type { DailyAdherenceByPolicySource, DailyAdherenceSource } from '../../analysis/types/daily-adherence.source.js';
import type { DailyMealAssessmentSource } from '../../analysis/types/meal-assessment.type.js';
import type { NutritionPolicyDeferralSource } from '../../analysis/types/nutrition-targets.type.js';
import type { NutritionTargetProvenance } from '../../analysis/types/nutrition-targets.type.js';

/**
 * Evaluation metadata carried through recommendation resolution.
 *
 * This is a read-only view of existing evaluation projections and snapshots.
 * Recommendation policies do not calculate or mutate any of these values.
 */
export interface RecommendationEvaluationMetadata {
  readonly evaluationMode?: 'current-recomputation' | 'historical-replay';
  readonly evaluationStatus?: 'evaluated' | 'insufficient-evidence';
  readonly coverage?: number;
  readonly mealAssessments?: readonly DailyMealAssessmentSource[];
  readonly mealAssessmentsByDate?: readonly RecommendationEvaluationDay[];
  readonly dailyAdherence?: DailyAdherenceSource;
  readonly dailyAdherenceByPolicy?: readonly DailyAdherenceByPolicySource[];
  readonly targetProvenance?: readonly NutritionTargetProvenance[];
  readonly dailyAdherenceByDate?: readonly RecommendationEvaluationDay[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
  readonly snapshotIds: readonly string[];
  readonly evaluatorVersions: readonly string[];
  readonly policySetFingerprints: readonly string[];
  readonly snapshotFingerprints: readonly string[];
  readonly replayLimitations: readonly string[];
}

export interface RecommendationEvaluationDay {
  readonly date: string;
  readonly mealAssessments?: readonly DailyMealAssessmentSource[];
  readonly dailyAdherence?: DailyAdherenceSource;
  readonly dailyAdherenceByPolicy?: readonly DailyAdherenceByPolicySource[];
}
