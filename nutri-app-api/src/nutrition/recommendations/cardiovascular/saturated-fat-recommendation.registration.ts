import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { decodeMealEvaluationSnapshot, snapshotEvidenceSource } from '../services/meal-evaluation-snapshot.adapter.js';
import { RecommendationPolicyRegistration } from '../types/recommendation-registration.type.js';
import { CardiovascularSaturatedFatRecommendationPolicy } from './saturated-fat-recommendation.policy.js';
import { SaturatedFatRecommendationProjection } from './saturated-fat-recommendation.types.js';

export function createCardiovascularSaturatedFatRecommendationRegistration(): RecommendationPolicyRegistration<SaturatedFatRecommendationProjection> {
  return {
    policy: new CardiovascularSaturatedFatRecommendationPolicy(),
    buildContext: (baseContext) => {
      const snapshot = baseContext.projection as MealEvaluationSnapshotSource;
      const payload = decodeMealEvaluationSnapshot(snapshot);
      return {
        ...baseContext,
        projection: {
          snapshot,
          payload: {
            contributions: payload.contributions,
            targets: payload.targets,
            deferredPolicies: payload.deferredPolicies,
            targetProvenance: payload.targetProvenance,
          },
        },
        sources: [snapshotEvidenceSource(snapshot)],
      };
    },
  };
}
