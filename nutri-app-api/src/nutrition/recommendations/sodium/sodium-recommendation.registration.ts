import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { decodeMealEvaluationSnapshot, snapshotEvidenceSource } from '../services/meal-evaluation-snapshot.adapter.js';
import { RecommendationPolicyRegistration } from '../types/recommendation-registration.type.js';
import { SodiumRecommendationPolicy } from './sodium-recommendation.policy.js';
import { SodiumRecommendationProjection } from './sodium-recommendation.types.js';

export function createSodiumRecommendationRegistration(): RecommendationPolicyRegistration<SodiumRecommendationProjection> {
  return {
    policy: new SodiumRecommendationPolicy(),
    buildContext: (baseContext) => {
      const snapshot = baseContext.projection as MealEvaluationSnapshotSource;
      const payload = decodeMealEvaluationSnapshot(snapshot);
      return {
        ...baseContext,
        projection: {
          snapshot,
          payload: {
            reasons: payload.reasons,
            targets: payload.targets,
            deferredPolicies: payload.deferredPolicies,
          },
        },
        sources: [snapshotEvidenceSource(snapshot)],
      };
    },
  };
}
