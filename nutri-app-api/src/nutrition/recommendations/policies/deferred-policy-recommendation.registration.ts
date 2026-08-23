import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { decodeMealEvaluationSnapshot, snapshotEvidenceSource } from '../services/meal-evaluation-snapshot.adapter.js';
import { RecommendationPolicyRegistration } from '../types/recommendation-registration.type.js';
import { DeferredPolicyRecommendationPolicy, DeferredPolicyRecommendationProjection } from './deferred-policy-recommendation.policy.js';

export function createDeferredPolicyRecommendationRegistration(): RecommendationPolicyRegistration<DeferredPolicyRecommendationProjection> {
  return {
    policy: new DeferredPolicyRecommendationPolicy(),
    buildContext: (baseContext) => {
      if (baseContext.scope === 'daily') {
        const summary = baseContext.projection as DailyNutritionSummarySource;
        const evidenceSource = { sourceType: 'daily-summary' as const, sourceId: `${baseContext.userId}:${summary.date}`, version: 'nutrition-analysis-v1' };
        return {
          ...baseContext,
          projection: { deferredPolicies: summary.deferredPolicies, evidenceSource },
          sources: [evidenceSource],
        };
      }
      if (baseContext.scope === 'historical' || baseContext.scope === 'weekly') {
        const summaries = baseContext.projection as readonly DailyNutritionSummarySource[];
        const evidenceSource = { sourceType: baseContext.scope === 'weekly' ? 'weekly-summary' as const : 'historical-summary' as const, sourceId: baseContext.contextId, version: 'nutrition-analysis-v1' };
        return {
          ...baseContext,
          projection: { deferredPolicies: summaries.flatMap(({ deferredPolicies }) => deferredPolicies), evidenceSource },
          sources: [evidenceSource],
        };
      }
      const snapshot = baseContext.projection as MealEvaluationSnapshotSource;
      const payload = decodeMealEvaluationSnapshot(snapshot);
      return {
        ...baseContext,
        projection: {
          deferredPolicies: payload.deferredPolicies,
          evidenceSource: snapshotEvidenceSource(snapshot),
        },
        sources: [snapshotEvidenceSource(snapshot)],
      };
    },
  };
}
