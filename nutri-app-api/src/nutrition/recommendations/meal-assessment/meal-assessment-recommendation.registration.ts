import type { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import type { RecommendationPolicyRegistration } from '../types/recommendation-registration.type.js';
import { MealAssessmentRecommendationPolicy } from './meal-assessment-recommendation.policy.js';
import type { MealAssessmentRecommendationProjection } from './meal-assessment-recommendation.types.js';

export function createMealAssessmentRecommendationRegistration(): RecommendationPolicyRegistration<MealAssessmentRecommendationProjection> {
  return {
    policy: new MealAssessmentRecommendationPolicy(),
    buildContext: (baseContext) => ({
      ...baseContext,
      projection: {
        summaries: (Array.isArray(baseContext.projection) ? baseContext.projection : [baseContext.projection]) as readonly DailyNutritionSummarySource[],
      },
      sources: [{
        sourceType: baseContext.scope === 'weekly' ? 'weekly-summary' as const : baseContext.scope === 'historical' ? 'historical-summary' as const : 'daily-summary' as const,
        sourceId: baseContext.contextId,
        version: 'nutrition-analysis-v1',
      }],
    }),
  };
}
