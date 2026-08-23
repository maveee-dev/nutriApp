import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { RecommendationPolicyRegistration } from '../types/recommendation-registration.type.js';
import { DiabetesCarbohydrateAdherenceRecommendationPolicy } from './carbohydrate-adherence-recommendation.policy.js';
import { DiabetesCarbohydrateAdherenceRecommendationProjection } from './carbohydrate-adherence-recommendation.types.js';

export function createDiabetesCarbohydrateAdherenceRecommendationRegistration(): RecommendationPolicyRegistration<DiabetesCarbohydrateAdherenceRecommendationProjection> {
  return {
    policy: new DiabetesCarbohydrateAdherenceRecommendationPolicy(),
    buildContext: (baseContext) => {
      const summary = baseContext.projection as DailyNutritionSummarySource;
      return {
        ...baseContext,
        projection: { summary },
        sources: [{ sourceType: 'daily-summary', sourceId: `${baseContext.userId}:${summary.date}`, version: 'nutrition-analysis-v1' }],
      };
    },
  };
}
