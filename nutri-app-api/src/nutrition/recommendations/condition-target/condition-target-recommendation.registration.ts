import type { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { decodeMealEvaluationSnapshot, snapshotEvidenceSource } from '../services/meal-evaluation-snapshot.adapter.js';
import type { RecommendationPolicyRegistration } from '../types/recommendation-registration.type.js';
import { ConditionTargetRecommendationPolicy } from './condition-target-recommendation.policy.js';
import type { ConditionTargetRecommendationProjection } from './condition-target-recommendation.types.js';

export function createConditionTargetRecommendationRegistration(
  nutrient: 'protein' | 'carbohydrates' | 'potassium' | 'phosphorus',
  targetPolicyIds: readonly string[],
): RecommendationPolicyRegistration<ConditionTargetRecommendationProjection> {
  return {
    policy: new ConditionTargetRecommendationPolicy(nutrient, targetPolicyIds),
    buildContext: (baseContext) => {
      const snapshot = baseContext.projection as MealEvaluationSnapshotSource;
      const payload = decodeMealEvaluationSnapshot(snapshot);
      return {
        ...baseContext,
        projection: { snapshot, payload: { reasons: payload.reasons, contributions: payload.contributions, targets: payload.targets, deferredPolicies: payload.deferredPolicies, targetProvenance: payload.targetProvenance } },
        sources: [snapshotEvidenceSource(snapshot)],
      };
    },
  };
}
