import { RecommendationCandidate, recommendationConflictKey } from '../types/recommendation-candidate.type.js';
import { RecommendationEvidence } from '../types/recommendation-evidence.type.js';
import { RecommendationPolicy } from '../types/recommendation-policy.type.js';
import { Recommendation } from '../types/recommendation.type.js';
import { snapshotEvidence } from '../services/meal-evaluation-snapshot.adapter.js';
import { GeneralUpperLimitRecommendationContext, GeneralUpperLimitRecommendationProjection } from './upper-limit-recommendation.types.js';

export class GeneralUpperLimitRecommendationPolicy implements RecommendationPolicy<GeneralUpperLimitRecommendationProjection> {
  readonly policyId: string;
  readonly version: string;
  readonly source = 'NutriApp approved General Nutrition upper-limit guidance';
  readonly scopes = ['current-food', 'current-meal'] as const;

  constructor(private readonly nutrient: 'added-sugar' | 'cholesterol', private readonly label: string, private readonly unit: string) {
    const identity = nutrient === 'added-sugar' ? 'added-sugar' : 'cholesterol';
    this.policyId = `general-nutrition-${identity}-recommendation`;
    this.version = `${this.policyId}-v1`;
  }

  evaluate(context: GeneralUpperLimitRecommendationContext): readonly RecommendationCandidate[] {
    const { snapshot, payload } = context.projection;
    const reason = payload.reasons.find((item) => item.nutrient === this.nutrient);
    const contribution = payload.contributions.find((item) => item.nutrient === this.nutrient);
    // A contribution alone is not evidence that an upper-limit policy is
    // active. This also preserves historical cholesterol recommendations:
    // snapshots created under general-nutrition-cholesterol-v1 contain a
    // cholesterol reason, while current snapshots intentionally contain only
    // the informational contribution.
    if (reason == null) return [];
    const measured = reason?.measuredValue ?? contribution?.amount ?? null;
    const target = reason?.targetValue ?? contribution?.targetValue ?? null;
    const evidence: RecommendationEvidence[] = [
      snapshotEvidence(snapshot, 'evaluation', 'reasons', measured, reason?.explanation ?? contribution?.explanation ?? `${this.label} contribution captured by the immutable snapshot.`, this.unit),
      snapshotEvidence(snapshot, 'target', `targets.${this.nutrient}`, target, `The ${this.label} target was captured by the immutable evaluation snapshot.`, this.unit),
    ];
    const exceeded = reason?.code === `${this.nutrient}-above-target`;
    const category = exceeded ? 'caution' : 'positive';
    const recommendation: Recommendation = {
      id: `general-${this.nutrient}-${exceeded ? 'caution' : 'positive'}`,
      category,
      disposition: 'informational',
      severity: exceeded ? 'moderate' : 'low',
      scope: context.scope,
      title: exceeded ? `${this.label} is above the applicable limit` : `${this.label} is within the applicable limit`,
      message: exceeded ? (reason?.explanation ?? `This portion is above the applicable ${this.label} limit.`) : (reason?.explanation ?? `This portion contributes ${measured} ${this.unit} toward the applicable ${this.label} limit.`),
      nutrient: this.nutrient,
      evidence,
      policy: { policyId: this.policyId, version: this.version, source: this.source },
      ...(exceeded ? { actions: [`Choose a lower-${this.label} option for a future meal.`] } : {}),
    };
    return [{ candidateId: recommendation.id, recommendation, conflictKey: recommendationConflictKey('nutrient', this.nutrient, context.scope, category), priority: exceeded ? 65 : 35, specificity: 1 }];
  }
}
