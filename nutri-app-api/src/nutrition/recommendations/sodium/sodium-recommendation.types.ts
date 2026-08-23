import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { EvaluationSnapshotPayload } from '../services/meal-evaluation-snapshot.adapter.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';

export type SodiumEvaluationSnapshotPayload = Pick<
  EvaluationSnapshotPayload,
  'reasons' | 'targets' | 'deferredPolicies'
>;

export interface SodiumRecommendationProjection {
  readonly snapshot: MealEvaluationSnapshotSource;
  readonly payload: SodiumEvaluationSnapshotPayload;
}

export type SodiumRecommendationContext = RecommendationContext<SodiumRecommendationProjection>;
