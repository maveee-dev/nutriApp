import { Decimal } from 'decimal.js';
import { RecommendationCandidate, recommendationConflictKey, RecommendationConflictKey } from '../types/recommendation-candidate.type.js';
import { RecommendationPolicy } from '../types/recommendation-policy.type.js';
import { RecommendationEvidence } from '../types/recommendation-evidence.type.js';
import { Recommendation } from '../types/recommendation.type.js';
import { snapshotEvidence } from '../services/meal-evaluation-snapshot.adapter.js';
import { NutritionTargetProvenance } from '../../analysis/types/nutrition-targets.type.js';
import { SaturatedFatRecommendationContext } from './saturated-fat-recommendation.types.js';

export const CARDIOVASCULAR_SATURATED_FAT_RECOMMENDATION_POLICY_ID = 'cardiovascular-saturated-fat-recommendation';
export const CARDIOVASCULAR_SATURATED_FAT_RECOMMENDATION_POLICY_VERSION = 'cardiovascular-saturated-fat-recommendation-v1';

const POLICY_SOURCE = 'NutriApp approved cardiovascular saturated-fat policy';
const TARGET_POLICY_ID = 'cardiovascular-saturated-fat-v1';

export class CardiovascularSaturatedFatRecommendationPolicy implements RecommendationPolicy<SaturatedFatRecommendationContext['projection']> {
  readonly policyId = CARDIOVASCULAR_SATURATED_FAT_RECOMMENDATION_POLICY_ID;
  readonly version = CARDIOVASCULAR_SATURATED_FAT_RECOMMENDATION_POLICY_VERSION;
  readonly source = POLICY_SOURCE;
  readonly scopes = ['current-food', 'current-meal'] as const;

  evaluate(context: SaturatedFatRecommendationContext): readonly RecommendationCandidate[] {
    const { snapshot, payload } = context.projection;
    const contribution = payload.contributions.find((item) => item.nutrient === 'saturated-fat');
    const target = payload.targets.saturatedFatGrams;
    const provenance = payload.targetProvenance?.find((item) => item.target === 'saturatedFatGrams');
    const deferred = payload.deferredPolicies.find((item) => item.policyId === TARGET_POLICY_ID);

    if (deferred != null) return [this.deferredCandidate(context, deferred.reason, deferred.explanation)];
    if (provenance?.policyId !== TARGET_POLICY_ID) return [];
    if (contribution == null || target == null) return [this.deferredCandidate(context, 'saturated-fat-evidence-unavailable', 'Saturated-fat guidance is deferred because the immutable evaluation snapshot does not contain both the contribution and applicable target.')];

    const evidence = this.evidence(snapshot, contribution.amount, target, contribution.explanation, provenance);
    let exceeded: boolean;
    try {
      exceeded = new Decimal(contribution.amount).gt(new Decimal(target));
    } catch {
      return [this.deferredCandidate(context, 'invalid-saturated-fat-evidence', 'Saturated-fat guidance is deferred because the immutable evaluation snapshot contains an invalid contribution or target value.')];
    }
    if (exceeded) {
      return [
        this.candidate(this.recommendation(context, 'caution', 'moderate', 'Saturated fat is above the applicable target', contribution.explanation, evidence), recommendationConflictKey('nutrient', 'saturated-fat', context.scope, 'caution'), 80, 2),
        this.candidate(this.recommendation(context, 'improvement', 'moderate', 'Consider a lower-saturated-fat option', 'For the next meal, consider a lower-saturated-fat alternative or balance this choice with lower-saturated-fat foods.', evidence, ['Choose a lower-saturated-fat alternative for a future meal.']), recommendationConflictKey('nutrient', 'saturated-fat', context.scope, 'improvement'), 70, 2),
      ];
    }

    return [this.candidate(this.recommendation(context, 'positive', 'low', 'Saturated fat is within the applicable target', contribution.explanation, evidence), recommendationConflictKey('nutrient', 'saturated-fat', context.scope, 'positive'), 50, 2)];
  }

  private recommendation(
    context: SaturatedFatRecommendationContext,
    category: Recommendation['category'],
    severity: Recommendation['severity'],
    title: string,
    message: string,
    evidence: readonly RecommendationEvidence[],
    actions?: readonly string[],
  ): Recommendation {
    return {
      id: `cardiovascular-saturated-fat-${category}`,
      category,
      disposition: category === 'improvement' ? 'actionable' : 'informational',
      severity,
      scope: context.scope,
      title,
      message,
      nutrient: 'saturated-fat',
      evidence,
      policy: { policyId: this.policyId, version: this.version, source: this.source },
      ...(actions == null ? {} : { actions }),
    };
  }

  private deferredCandidate(context: SaturatedFatRecommendationContext, reason: string, message: string): RecommendationCandidate {
    const recommendation: Recommendation = {
      id: `cardiovascular-saturated-fat-deferred-${reason}`,
      category: 'deferred-policy',
      disposition: 'informational',
      severity: 'low',
      scope: context.scope,
      title: 'Cardiovascular saturated-fat guidance is deferred',
      message,
      nutrient: 'saturated-fat',
      evidence: [snapshotEvidence(context.projection.snapshot, 'policy-deferral', 'deferredPolicies', reason, message)],
      policy: { policyId: this.policyId, version: this.version, source: this.source },
      limitations: ['This message does not establish a diagnosis or clinical restriction.'],
    };
    return this.candidate(recommendation, recommendationConflictKey('nutrient', 'saturated-fat', context.scope, 'deferred'), 10, 1);
  }

  private evidence(snapshot: SaturatedFatRecommendationContext['projection']['snapshot'], amount: string, target: string, explanation: string, provenance?: NutritionTargetProvenance): readonly RecommendationEvidence[] {
    const evidence: RecommendationEvidence[] = [
      snapshotEvidence(snapshot, 'evaluation', 'contributions.saturated-fat', amount, explanation, 'g'),
      snapshotEvidence(snapshot, 'target', 'targets.saturatedFatGrams', target, 'Saturated-fat target captured by the immutable evaluation snapshot.', 'g'),
    ];
    if (provenance != null) evidence.push(snapshotEvidence(snapshot, 'policy', 'targets.saturatedFatGrams.provenance', `${provenance.policyId}:${provenance.version}`, `${provenance.source} (${provenance.version}) governs the captured saturated-fat target.`));
    return evidence;
  }

  private candidate(recommendation: Recommendation, conflictKey: RecommendationConflictKey, priority: number, specificity: number): RecommendationCandidate {
    return { candidateId: recommendation.id, recommendation, conflictKey, priority, specificity };
  }
}
