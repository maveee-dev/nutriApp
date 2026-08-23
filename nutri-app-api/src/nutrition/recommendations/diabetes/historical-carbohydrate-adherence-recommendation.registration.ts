import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { RecommendationPolicyRegistration } from '../types/recommendation-registration.type.js';
import { DiabetesHistoricalCarbohydrateAdherenceRecommendationPolicy } from './historical-carbohydrate-adherence-recommendation.policy.js';
import { HistoricalCarbohydrateAdherenceRecommendationProjection } from './historical-carbohydrate-adherence-recommendation.types.js';

export function createDiabetesHistoricalCarbohydrateAdherenceRecommendationRegistration(): RecommendationPolicyRegistration<HistoricalCarbohydrateAdherenceRecommendationProjection> {
  return {
    policy: new DiabetesHistoricalCarbohydrateAdherenceRecommendationPolicy(),
    buildContext: (baseContext) => ({
      ...baseContext,
      projection: { summaries: baseContext.projection as readonly DailyNutritionSummarySource[] },
      sources: [{ sourceType: 'historical-summary', sourceId: baseContext.contextId, version: 'nutrition-analysis-v1' }],
    }),
  };
}
