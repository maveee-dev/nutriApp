import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';

export interface HistoricalCarbohydrateAdherenceRecommendationProjection {
  readonly summaries: readonly DailyNutritionSummarySource[];
}

export type HistoricalCarbohydrateAdherenceRecommendationContext = RecommendationContext<HistoricalCarbohydrateAdherenceRecommendationProjection>;
