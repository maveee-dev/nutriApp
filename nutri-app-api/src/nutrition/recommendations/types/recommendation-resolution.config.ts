import { RecommendationScope, RecommendationSeverity } from './recommendation.type.js';

export interface RecommendationResolutionConfig {
  readonly categoryRanks: Readonly<Record<string, number>>;
  readonly severityRanks: Readonly<Record<RecommendationSeverity, number>>;
  readonly limitsByScope: Readonly<Record<string, number>>;
}

export const DEFAULT_RECOMMENDATION_RESOLUTION_CONFIG: RecommendationResolutionConfig = {
  categoryRanks: {
    'follow-up': 80,
    caution: 70,
    improvement: 60,
    positive: 50,
    adherence: 40,
    monitoring: 40,
    educational: 30,
    'deferred-policy': 20,
  },
  severityRanks: {
    high: 3,
    moderate: 2,
    low: 1,
  },
  limitsByScope: {
    'current-food': 3,
    'current-meal': 3,
    daily: 4,
    weekly: 4,
    historical: 3,
  },
};

export function recommendationLimit(
  config: RecommendationResolutionConfig,
  scope: RecommendationScope,
): number {
  return config.limitsByScope[scope] ?? 3;
}
