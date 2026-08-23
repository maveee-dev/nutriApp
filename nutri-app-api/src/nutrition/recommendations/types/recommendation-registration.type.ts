import { RecommendationContext } from './recommendation-context.type.js';
import { RecommendationPolicy } from './recommendation-policy.type.js';

export type RecommendationContextBuilder<TProjection> = (
  baseContext: RecommendationContext,
) => RecommendationContext<TProjection>;

export interface RecommendationPolicyRegistration<TProjection = unknown> {
  readonly policy: RecommendationPolicy<TProjection>;
  readonly buildContext: RecommendationContextBuilder<TProjection>;
}

/**
 * Intentional type erasure at the composition boundary. Each registration keeps
 * its projection typed internally; the composing service treats registrations
 * uniformly after their context builders have been selected.
 */
export type AnyRecommendationPolicyRegistration = RecommendationPolicyRegistration<any>;
