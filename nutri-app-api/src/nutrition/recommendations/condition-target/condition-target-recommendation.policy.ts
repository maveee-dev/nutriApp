import { RecommendationCandidate, recommendationConflictKey, RecommendationConflictKey } from '../types/recommendation-candidate.type.js';
import type { RecommendationPolicy } from '../types/recommendation-policy.type.js';
import type { RecommendationEvidence } from '../types/recommendation-evidence.type.js';
import type { Recommendation } from '../types/recommendation.type.js';
import { snapshotEvidence } from '../services/meal-evaluation-snapshot.adapter.js';
import type { ConditionTargetRecommendationContext } from './condition-target-recommendation.types.js';

export class ConditionTargetRecommendationPolicy implements RecommendationPolicy<ConditionTargetRecommendationContext['projection']> {
  readonly policyId: string;
  readonly version: string;
  readonly source = 'NutriApp approved condition-specific target guidance';
  readonly scopes = ['current-food', 'current-meal'] as const;

  constructor(private readonly nutrient: 'protein' | 'carbohydrates', private readonly targetPolicyIds: readonly string[]) {
    this.policyId = `${nutrient}-condition-target-recommendation`;
    this.version = `${this.policyId}-v1`;
  }

  evaluate(context: ConditionTargetRecommendationContext): readonly RecommendationCandidate[] {
    const { snapshot, payload } = context.projection;
    const provenance = payload.targetProvenance?.find(({ target, policyId }) => this.targetMatches(target) && this.targetPolicyIds.includes(policyId));
    if (provenance == null) return [];
    const deferred = payload.deferredPolicies.find(({ policyId }) => this.targetPolicyIds.includes(policyId));
    if (deferred != null) return [this.deferred(context, deferred.reason, deferred.explanation)];

    const contribution = payload.contributions.find(({ nutrient }) => nutrient === this.nutrient);
    const reason = payload.reasons.find(({ nutrient }) => nutrient === this.nutrient);
    const target = this.targetValue(payload.targets);
    if (contribution == null || target == null) return [this.deferred(context, `${this.nutrient}-evidence-unavailable`, `Condition-specific ${this.label()} guidance is deferred because the evaluation snapshot lacks the required contribution or target.`)];

    const evidence: RecommendationEvidence[] = [
      snapshotEvidence(snapshot, 'evaluation', `contributions.${this.nutrient}`, contribution.amount, contribution.explanation, this.unit()),
      snapshotEvidence(snapshot, 'target', `targets.${this.targetKey()}`, target, `The applicable ${this.label()} target was captured by the immutable evaluation snapshot.`, this.unit()),
      snapshotEvidence(snapshot, 'policy', `targets.${this.targetKey()}.provenance`, `${provenance.policyId}:${provenance.version}`, `${provenance.source} (${provenance.version}) governs this target.`),
    ];
    const negative = reason?.direction === 'negative';
    if (negative) {
      return [
        this.candidate(this.recommendation(context, 'caution', 'moderate', `${this.label()} needs attention`, reason?.explanation ?? `This portion is not aligned with the applicable ${this.label()} target.`, evidence), 'caution', 80),
        this.candidate(this.recommendation(context, 'improvement', 'moderate', `Choose a stronger ${this.label()} fit`, `Consider another option that better supports the applicable ${this.label()} target.`, evidence, [`Use the applicable ${this.label()} target when choosing the next meal.`]), 'improvement', 70),
      ];
    }
    return [this.candidate(this.recommendation(context, 'positive', 'low', `${this.label()} contribution is supported`, reason?.explanation ?? contribution.explanation, evidence), 'positive', 50)];
  }

  private targetMatches(target: string): boolean { return this.nutrient === 'protein' ? target === 'proteinGrams' : target === 'carbohydrateGrams'; }
  private targetKey(): 'proteinGrams' | 'carbohydrateGrams' { return this.nutrient === 'protein' ? 'proteinGrams' : 'carbohydrateGrams'; }
  private targetValue(targets: ConditionTargetRecommendationContext['projection']['payload']['targets']): string | null { return this.nutrient === 'protein' ? targets.proteinGrams ?? null : targets.carbohydrateGrams ?? null; }
  private label(): string { return this.nutrient === 'protein' ? 'protein' : 'carbohydrate'; }
  private unit(): string { return 'g'; }

  private deferred(context: ConditionTargetRecommendationContext, reason: string, message: string): RecommendationCandidate {
    const recommendation: Recommendation = { id: `${this.policyId}-deferred-${reason}`, category: 'deferred-policy', disposition: 'informational', severity: 'low', scope: context.scope, title: `${this.label()} guidance is deferred`, message, nutrient: this.nutrient, evidence: [snapshotEvidence(context.projection.snapshot, 'policy-deferral', 'deferredPolicies', reason, message)], policy: { policyId: this.policyId, version: this.version, source: this.source }, limitations: ['This message does not establish a diagnosis, prescribe treatment, or replace professional medical judgment.'] };
    return this.candidate(recommendation, 'deferred', 20);
  }

  private recommendation(context: ConditionTargetRecommendationContext, category: Recommendation['category'], severity: Recommendation['severity'], title: string, message: string, evidence: readonly RecommendationEvidence[], actions?: readonly string[]): Recommendation {
    return { id: `${this.policyId}-${category}`, category, disposition: category === 'improvement' ? 'actionable' : 'informational', severity, scope: context.scope, title, message, nutrient: this.nutrient, evidence, policy: { policyId: this.policyId, version: this.version, source: this.source }, ...(actions == null ? {} : { actions }) };
  }

  private candidate(recommendation: Recommendation, disposition: string, priority: number): RecommendationCandidate {
    const key = recommendationConflictKey('nutrient', this.nutrient, recommendation.scope, disposition);
    return { candidateId: recommendation.id, recommendation, conflictKey: key as RecommendationConflictKey, priority, specificity: 2 };
  }
}
