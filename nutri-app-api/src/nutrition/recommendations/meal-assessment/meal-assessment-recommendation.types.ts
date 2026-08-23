import type { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import type { RecommendationContext } from '../types/recommendation-context.type.js';

export interface MealAssessmentRecommendationProjection {
  readonly summaries: readonly DailyNutritionSummarySource[];
}

export type MealAssessmentRecommendationContext = RecommendationContext<MealAssessmentRecommendationProjection>;
