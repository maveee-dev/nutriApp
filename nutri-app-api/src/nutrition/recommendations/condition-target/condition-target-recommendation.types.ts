import type { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import type { EvaluationSnapshotPayload } from '../../../meals/snapshots/meal-evaluation-snapshot.adapter.js';
import type { RecommendationContext } from '../types/recommendation-context.type.js';

export interface ConditionTargetRecommendationProjection {
  readonly snapshot: MealEvaluationSnapshotSource;
  readonly payload: Pick<EvaluationSnapshotPayload, 'reasons' | 'contributions' | 'targets' | 'deferredPolicies' | 'targetProvenance'>;
}

export type ConditionTargetRecommendationContext = RecommendationContext<ConditionTargetRecommendationProjection>;
