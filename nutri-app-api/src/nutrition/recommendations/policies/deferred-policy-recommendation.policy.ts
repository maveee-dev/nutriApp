import { NutritionPolicyDeferralSource } from '../../analysis/types/nutrition-targets.type.js';
import { RecommendationCandidate } from '../types/recommendation-candidate.type.js';
import { recommendationConflictKey } from '../types/recommendation-candidate.type.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';
import { RecommendationEvidenceSource } from '../types/recommendation-evidence.type.js';
import { RecommendationPolicy } from '../types/recommendation-policy.type.js';

export interface DeferredPolicyRecommendationProjection {
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
  readonly evidenceSource: RecommendationEvidenceSource;
}

export const DEFERRED_POLICY_RECOMMENDATION_POLICY_ID = 'deferred-policy-recommendation';
export const DEFERRED_POLICY_RECOMMENDATION_POLICY_VERSION = 'deferred-policy-recommendation-v1';

export class DeferredPolicyRecommendationPolicy implements RecommendationPolicy<DeferredPolicyRecommendationProjection> {
  readonly policyId = DEFERRED_POLICY_RECOMMENDATION_POLICY_ID;
  readonly version = DEFERRED_POLICY_RECOMMENDATION_POLICY_VERSION;
  readonly source = 'NutriApp policy deferral explanation';
  readonly scopes = ['current-food', 'current-meal', 'daily', 'weekly', 'historical'] as const;

  evaluate(
    context: RecommendationContext<DeferredPolicyRecommendationProjection>,
  ): readonly RecommendationCandidate[] {
    return context.projection.deferredPolicies.map((deferredPolicy) => ({
      candidateId: `${this.policyId}-${deferredPolicy.policyId}`,
      conflictKey: recommendationConflictKey('policy', deferredPolicy.policyId, context.scope, 'deferred'),
      priority: 10,
      specificity: 1,
      recommendation: {
        id: `${this.policyId}-${deferredPolicy.policyId}`,
        category: 'deferred-policy',
        disposition: 'informational',
        severity: 'low',
        scope: context.scope,
        title: 'Specific nutrition guidance is deferred',
        message: `More specific nutrition guidance is deferred: ${deferredPolicy.explanation}`,
        evidence: [{
          id: `${context.projection.evidenceSource.sourceId}-${deferredPolicy.policyId}`,
          kind: 'policy-deferral',
          source: context.projection.evidenceSource,
          field: 'deferredPolicies',
          value: deferredPolicy.reason,
          explanation: deferredPolicy.explanation,
        }],
        policy: {
          policyId: this.policyId,
          version: this.version,
          source: this.source,
        },
        limitations: ['This message does not establish a diagnosis or clinical restriction.'],
      },
    }));
  }
}
