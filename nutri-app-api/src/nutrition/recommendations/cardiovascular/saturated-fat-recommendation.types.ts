import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { EvaluationSnapshotPayload } from '../services/meal-evaluation-snapshot.adapter.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';

export type SaturatedFatRecommendationPayload = Pick<
  EvaluationSnapshotPayload,
  'contributions' | 'targets' | 'deferredPolicies' | 'targetProvenance'
>;

export interface SaturatedFatRecommendationProjection {
  readonly snapshot: MealEvaluationSnapshotSource;
  readonly payload: SaturatedFatRecommendationPayload;
}

export type SaturatedFatRecommendationContext = RecommendationContext<SaturatedFatRecommendationProjection>;
