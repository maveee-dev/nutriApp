import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { EvaluationSnapshotPayload } from '../services/meal-evaluation-snapshot.adapter.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';

export interface GeneralUpperLimitRecommendationProjection {
  readonly snapshot: MealEvaluationSnapshotSource;
  readonly payload: Pick<EvaluationSnapshotPayload, 'reasons' | 'contributions' | 'targets' | 'deferredPolicies'>;
}

export type GeneralUpperLimitRecommendationContext = RecommendationContext<GeneralUpperLimitRecommendationProjection>;
