import { Recommendation } from './recommendation.type.js';

/**
 * Stable semantic identifier used by the resolver to identify candidates that
 * compete for the same recommendation slot. It should describe the subject,
 * scope, and outcome—not the policy instance that happened to produce it.
 *
 * Example: nutrient:sodium:current-food:caution
 */
export type RecommendationConflictKey = string & {
  readonly __recommendationConflictKey: unique symbol;
};

export function recommendationConflictKey(...segments: readonly string[]): RecommendationConflictKey {
  return segments.map((segment) => segment.trim().toLowerCase()).join(':') as RecommendationConflictKey;
}

export interface RecommendationCandidate {
  readonly candidateId: string;
  readonly recommendation: Recommendation;
  readonly conflictKey: RecommendationConflictKey;
  readonly priority: number;
  readonly specificity: number;
}
