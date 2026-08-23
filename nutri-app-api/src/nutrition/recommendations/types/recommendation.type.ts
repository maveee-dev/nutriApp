import { RecommendationEvidence } from './recommendation-evidence.type.js';

export type RecommendationScope =
  | 'current-food'
  | 'current-meal'
  | 'daily'
  | 'weekly'
  | 'historical'
  | (string & {});

export type RecommendationCategory =
  | 'positive'
  | 'caution'
  | 'improvement'
  | 'educational'
  | 'adherence'
  | 'monitoring'
  | 'follow-up'
  | 'deferred-policy'
  | (string & {});

export type RecommendationDisposition =
  | 'informational'
  | 'actionable'
  | 'requires-clinical-follow-up';

export type RecommendationSeverity = 'low' | 'moderate' | 'high';

export interface RecommendationPolicyReference {
  readonly policyId: string;
  readonly version: string;
  readonly source?: string;
}

export interface Recommendation {
  readonly id: string;
  readonly category: RecommendationCategory;
  readonly disposition: RecommendationDisposition;
  readonly severity: RecommendationSeverity;
  readonly scope: RecommendationScope;
  readonly title: string;
  readonly message: string;
  readonly subject?: string;
  readonly nutrient?: string;
  readonly evidence: readonly RecommendationEvidence[];
  readonly policy: RecommendationPolicyReference;
  readonly limitations?: readonly string[];
  readonly actions?: readonly string[];
}
