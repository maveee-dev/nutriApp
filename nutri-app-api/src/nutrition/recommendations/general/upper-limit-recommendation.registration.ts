import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { decodeMealEvaluationSnapshot, snapshotEvidenceSource } from '../services/meal-evaluation-snapshot.adapter.js';
import { RecommendationPolicyRegistration } from '../types/recommendation-registration.type.js';
import { GeneralUpperLimitRecommendationPolicy } from './upper-limit-recommendation.policy.js';
import { GeneralUpperLimitRecommendationProjection } from './upper-limit-recommendation.types.js';

export function createGeneralUpperLimitRecommendationRegistration(nutrient: 'added-sugar' | 'cholesterol', label: string, unit: string): RecommendationPolicyRegistration<GeneralUpperLimitRecommendationProjection> {
  return {
    policy: new GeneralUpperLimitRecommendationPolicy(nutrient, label, unit),
    buildContext: (baseContext) => {
      const snapshot = baseContext.projection as MealEvaluationSnapshotSource;
      const payload = decodeMealEvaluationSnapshot(snapshot);
      return { ...baseContext, projection: { snapshot, payload: { reasons: payload.reasons, contributions: payload.contributions, targets: payload.targets, deferredPolicies: payload.deferredPolicies } }, sources: [snapshotEvidenceSource(snapshot)] };
    },
  };
}
