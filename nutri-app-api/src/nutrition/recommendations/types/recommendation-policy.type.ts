import { RecommendationCandidate } from './recommendation-candidate.type.js';
import { RecommendationContext } from './recommendation-context.type.js';
import { RecommendationScope } from './recommendation.type.js';

export interface RecommendationPolicy<TProjection = unknown> {
  readonly policyId: string;
  readonly version: string;
  readonly source?: string;
  readonly scopes: readonly RecommendationScope[];
  evaluate(
    context: RecommendationContext<TProjection>,
  ): readonly RecommendationCandidate[];
}
