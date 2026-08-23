import { RecommendationCandidate } from './recommendation-candidate.type.js';
import { RecommendationContext } from './recommendation-context.type.js';
import { Recommendation } from './recommendation.type.js';
import { RecommendationEvaluationMetadata } from './recommendation-evaluation.type.js';

export interface RecommendationSuppression {
  readonly candidateId: string;
  readonly reason:
    | 'duplicate'
    | 'lower-priority'
    | 'lower-specificity'
    | 'context-limit'
    | 'incompatible';
  readonly comparedWith?: string;
}

export interface RecommendationResolution {
  readonly selected: readonly Recommendation[];
  readonly suppressed: readonly RecommendationSuppression[];
  /** Additive projection metadata; existing selected/suppressed fields are unchanged. */
  readonly evaluation?: RecommendationEvaluationMetadata;
}

export interface RecommendationResolver {
  resolve(
    context: RecommendationContext,
    candidates: readonly RecommendationCandidate[],
  ): RecommendationResolution;
}
