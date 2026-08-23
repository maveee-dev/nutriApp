import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';

export interface DiabetesCarbohydrateAdherenceRecommendationProjection {
  readonly summary: DailyNutritionSummarySource;
}

export type DiabetesCarbohydrateAdherenceRecommendationContext = RecommendationContext<DiabetesCarbohydrateAdherenceRecommendationProjection>;
