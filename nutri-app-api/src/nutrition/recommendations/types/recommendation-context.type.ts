import { RecommendationEvidenceSource } from './recommendation-evidence.type.js';
import { RecommendationScope } from './recommendation.type.js';

export interface RecommendationPeriod {
  readonly start: string;
  readonly end: string;
  readonly timezone: string;
}

export interface RecommendationContext<TProjection = unknown> {
  readonly contextId: string;
  readonly userId: string;
  readonly scope: RecommendationScope;
  readonly asOf: string;
  readonly period?: RecommendationPeriod;
  readonly projection: TProjection;
  readonly sources: readonly RecommendationEvidenceSource[];
}
