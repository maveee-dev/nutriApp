import { RecommendationCandidate } from '../types/recommendation-candidate.type.js';
import { recommendationConflictKey, RecommendationConflictKey } from '../types/recommendation-candidate.type.js';
import { RecommendationPolicy } from '../types/recommendation-policy.type.js';
import { RecommendationEvidence } from '../types/recommendation-evidence.type.js';
import { Recommendation } from '../types/recommendation.type.js';
import { snapshotEvidence } from '../services/meal-evaluation-snapshot.adapter.js';
import { SodiumRecommendationContext, SodiumRecommendationProjection } from './sodium-recommendation.types.js';

export const SODIUM_RECOMMENDATION_POLICY_ID = 'sodium-recommendation';
export const SODIUM_RECOMMENDATION_POLICY_VERSION = 'sodium-recommendation-v1';

const POLICY_SOURCE = 'NutriApp approved sodium compatibility policy';

export class SodiumRecommendationPolicy implements RecommendationPolicy<SodiumRecommendationProjection> {
  readonly policyId = SODIUM_RECOMMENDATION_POLICY_ID;
  readonly version = SODIUM_RECOMMENDATION_POLICY_VERSION;
  readonly source = POLICY_SOURCE;
  readonly scopes = ['current-food', 'current-meal'] as const;

  evaluate(context: SodiumRecommendationContext): readonly RecommendationCandidate[] {
    const { snapshot, payload } = context.projection;
    const sodiumReason = payload.reasons.find((reason) => reason.nutrient === 'sodium');
    const candidates: RecommendationCandidate[] = [];

    if (sodiumReason?.code === 'sodium-above-target') {
      candidates.push(
        this.candidate(
          this.recommendation(
            'sodium-caution',
            'caution',
            'moderate',
            'Sodium caution',
            sodiumReason.explanation,
            sodiumReasonEvidence(snapshot, sodiumReason),
            undefined,
            context.scope,
          ),
          recommendationConflictKey('nutrient', 'sodium', context.scope, 'caution'),
          80,
          2,
        ),
        this.candidate(
          this.recommendation(
            'sodium-improvement',
            'improvement',
            'moderate',
            'Consider a lower-sodium option',
            'For the next meal, consider a lower-sodium alternative or pair this food with lower-sodium choices.',
            sodiumReasonEvidence(snapshot, sodiumReason),
            ['Choose a lower-sodium alternative for a future meal.'],
            context.scope,
          ),
          recommendationConflictKey('nutrient', 'sodium', context.scope, 'improvement'),
          70,
          2,
        ),
      );
    } else if (sodiumReason?.code === 'sodium-contribution') {
      candidates.push(
        this.candidate(
          this.recommendation(
            'sodium-positive',
            'positive',
            'low',
            'Sodium is within the current limit',
            sodiumReason.explanation,
            sodiumReasonEvidence(snapshot, sodiumReason),
          ),
          recommendationConflictKey('nutrient', 'sodium', context.scope, 'positive'),
          50,
          2,
        ),
      );
    } else {
      candidates.push(this.deferredCandidate(
        context,
        'sodium-evidence-unavailable',
        'Sodium guidance is deferred because sodium was not available in the immutable evaluation snapshot.',
      ));
    }

    return candidates;
  }

  private recommendation(
    id: string,
    category: Recommendation['category'],
    severity: Recommendation['severity'],
    title: string,
    message: string,
    evidence: readonly RecommendationEvidence[],
    actions?: readonly string[],
    scope: SodiumRecommendationContext['scope'] = 'current-food',
  ): Recommendation {
    return {
      id,
      category,
      disposition: category === 'improvement' ? 'actionable' : 'informational',
      severity,
      scope,
      title,
      message,
      nutrient: 'sodium',
      evidence,
      policy: {
        policyId: this.policyId,
        version: this.version,
        source: this.source,
      },
      ...(actions == null ? {} : { actions }),
    };
  }

  private deferredCandidate(
    context: SodiumRecommendationContext,
    reason: string,
    message: string,
    sourceField = 'deferredPolicies',
  ): RecommendationCandidate {
    const { snapshot } = context.projection;
    const recommendation: Recommendation = {
      id: `sodium-deferred-${reason}`,
      category: 'deferred-policy',
      disposition: 'informational',
      severity: 'low',
      scope: context.scope,
      title: 'Specific nutrition guidance is deferred',
      message,
      nutrient: 'sodium',
      evidence: [snapshotEvidence(snapshot, 'policy-deferral', sourceField, reason, message)],
      policy: {
        policyId: this.policyId,
        version: this.version,
        source: this.source,
      },
      limitations: ['This message does not establish a diagnosis or clinical restriction.'],
    };
    return this.candidate(
      recommendation,
      recommendationConflictKey('nutrient', 'sodium', context.scope, 'deferred'),
      10,
      1,
    );
  }

  private candidate(
    recommendation: Recommendation,
    conflictKey: RecommendationConflictKey,
    priority: number,
    specificity: number,
  ): RecommendationCandidate {
    return {
      candidateId: recommendation.id,
      recommendation,
      conflictKey,
      priority,
      specificity,
    };
  }
}

function sodiumReasonEvidence(
  snapshot: SodiumRecommendationContext['projection']['snapshot'],
  reason: SodiumRecommendationContext['projection']['payload']['reasons'][number],
): readonly RecommendationEvidence[] {
  return [
    snapshotEvidence(snapshot, 'evaluation', 'reasons', reason.measuredValue, reason.explanation, 'mg'),
    snapshotEvidence(
      snapshot,
      'target',
      'targets.sodiumMilligrams',
      reason.targetValue,
      'Sodium target captured by the immutable evaluation snapshot.',
      'mg',
    ),
  ];
}
