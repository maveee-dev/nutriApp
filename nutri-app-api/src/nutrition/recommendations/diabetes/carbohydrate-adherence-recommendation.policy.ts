import { Decimal } from 'decimal.js';
import { DiabetesCarbohydrateAdherenceResult } from '../../analysis/policies/diabetes/diabetes-carbohydrate-adherence.policy.js';
import { RecommendationCandidate, recommendationConflictKey, RecommendationConflictKey } from '../types/recommendation-candidate.type.js';
import { RecommendationEvidence } from '../types/recommendation-evidence.type.js';
import { RecommendationPolicy } from '../types/recommendation-policy.type.js';
import { Recommendation } from '../types/recommendation.type.js';
import { DiabetesCarbohydrateAdherenceRecommendationContext } from './carbohydrate-adherence-recommendation.types.js';
import { diabetesCarbohydrateAdherence } from './diabetes-adherence-projection.js';

export const DIABETES_CARBOHYDRATE_ADHERENCE_RECOMMENDATION_POLICY_ID = 'diabetes-carbohydrate-adherence-recommendation';
export const DIABETES_CARBOHYDRATE_ADHERENCE_RECOMMENDATION_POLICY_VERSION = 'diabetes-carbohydrate-adherence-recommendation-v1';

const POLICY_SOURCE = 'NutriApp approved diabetes carbohydrate adherence guidance';
const ADHERENCE_POLICY_ID = 'diabetes-carbohydrate-adherence-v1';

export class DiabetesCarbohydrateAdherenceRecommendationPolicy implements RecommendationPolicy<DiabetesCarbohydrateAdherenceRecommendationContext['projection']> {
  readonly policyId = DIABETES_CARBOHYDRATE_ADHERENCE_RECOMMENDATION_POLICY_ID;
  readonly version = DIABETES_CARBOHYDRATE_ADHERENCE_RECOMMENDATION_POLICY_VERSION;
  readonly source = POLICY_SOURCE;
  readonly scopes = ['daily'] as const;

  evaluate(context: DiabetesCarbohydrateAdherenceRecommendationContext): readonly RecommendationCandidate[] {
    const { summary } = context.projection;
    const adherence = diabetesCarbohydrateAdherence(summary);
    const deferred = summary.deferredPolicies.find(({ policyId }) => policyId === ADHERENCE_POLICY_ID);

    if (adherence == null) {
      return deferred == null ? [] : [this.deferredCandidate(context, deferred.reason, deferred.explanation)];
    }
    if (adherence.status === 'deferred' || adherence.targetCarbohydrateGrams == null || adherence.consumedCarbohydrateGrams == null) {
      return [this.deferredCandidate(
        context,
        adherence.deferredPolicy?.reason ?? 'incomplete-adherence-projection',
        adherence.deferredPolicy?.explanation ?? 'Carbohydrate adherence guidance is deferred because the daily adherence projection is incomplete.',
      )];
    }

    let exceeded: boolean;
    try {
      exceeded = new Decimal(adherence.exceededByGrams ?? '0').gt(0);
    } catch {
      return [this.deferredCandidate(context, 'invalid-adherence-projection', 'Carbohydrate adherence guidance is deferred because the daily adherence projection contains an invalid numeric value.')];
    }

    const evidence = this.evidence(context, adherence);
    if (exceeded) {
      return [
        this.candidate(
          this.recommendation(context, 'caution', 'moderate', 'Daily carbohydrate target exceeded', `The daily carbohydrate target was exceeded by ${adherence.exceededByGrams} g.`, evidence),
          recommendationConflictKey('nutrient', 'carbohydrates', context.scope, 'caution'),
          80,
          2,
        ),
        this.candidate(
          this.recommendation(context, 'improvement', 'moderate', 'Plan the next carbohydrate portions carefully', 'For the remainder of the day, choose portions that support the individualized carbohydrate target.', evidence, ['Use the remaining daily meals to return toward the individualized target.']),
          recommendationConflictKey('nutrient', 'carbohydrates', context.scope, 'improvement'),
          70,
          2,
        ),
      ];
    }

    return [this.candidate(
      this.recommendation(context, 'positive', 'low', 'You are on track with carbohydrates', `${adherence.consumedCarbohydrateGrams} g consumed of the individualized ${adherence.targetCarbohydrateGrams} g daily target; ${adherence.remainingCarbohydrateGrams ?? '0'} g remains.`, evidence),
      recommendationConflictKey('nutrient', 'carbohydrates', context.scope, 'adherence'),
      50,
      2,
    )];
  }

  private recommendation(
    context: DiabetesCarbohydrateAdherenceRecommendationContext,
    category: Recommendation['category'],
    severity: Recommendation['severity'],
    title: string,
    message: string,
    evidence: readonly RecommendationEvidence[],
    actions?: readonly string[],
  ): Recommendation {
    return {
      id: `diabetes-carbohydrate-adherence-${category}`,
      category,
      disposition: category === 'improvement' ? 'actionable' : 'informational',
      severity,
      scope: context.scope,
      title,
      message,
      nutrient: 'carbohydrates',
      evidence,
      policy: { policyId: this.policyId, version: this.version, source: this.source },
      ...(actions == null ? {} : { actions }),
    };
  }

  private deferredCandidate(context: DiabetesCarbohydrateAdherenceRecommendationContext, reason: string, message: string): RecommendationCandidate {
    const recommendation: Recommendation = {
      id: `diabetes-carbohydrate-adherence-deferred-${reason}`,
      category: 'deferred-policy',
      disposition: 'informational',
      severity: 'low',
      scope: context.scope,
      title: 'Carbohydrate adherence guidance is deferred',
      message,
      nutrient: 'carbohydrates',
      evidence: [{
        id: `${context.contextId}-diabetes-carbohydrate-adherence-${reason}`,
        kind: 'policy-deferral',
        source: { sourceType: 'daily-summary', sourceId: context.contextId, version: 'nutrition-analysis-v1' },
        field: 'deferredPolicies',
        value: reason,
        explanation: message,
      }],
      policy: { policyId: this.policyId, version: this.version, source: this.source },
      limitations: ['This message does not establish a diagnosis, prescribe treatment, or replace professional medical judgment.'],
    };
    return this.candidate(recommendation, recommendationConflictKey('policy', ADHERENCE_POLICY_ID, context.scope, 'deferred'), 20, 2);
  }

  private evidence(context: DiabetesCarbohydrateAdherenceRecommendationContext, adherence: DiabetesCarbohydrateAdherenceResult): readonly RecommendationEvidence[] {
    const source = { sourceType: 'daily-summary' as const, sourceId: context.contextId, version: 'nutrition-analysis-v1' };
    const evidence: RecommendationEvidence[] = [
      { id: `${context.contextId}-carbohydrates-consumed`, kind: 'summary', source, field: 'diabetesCarbohydrateAdherence.consumedCarbohydrateGrams', value: adherence.consumedCarbohydrateGrams, unit: 'g', explanation: 'Consumed carbohydrate value from the existing daily adherence projection.' },
      { id: `${context.contextId}-carbohydrates-target`, kind: 'target', source, field: 'diabetesCarbohydrateAdherence.targetCarbohydrateGrams', value: adherence.targetCarbohydrateGrams, unit: 'g', explanation: 'Individualized carbohydrate target from the existing daily adherence projection.' },
      { id: `${context.contextId}-carbohydrates-snapshot-coverage`, kind: 'snapshot', source, field: 'diabetesCarbohydrateAdherence.snapshotIds', value: adherence.snapshotIds.join(','), explanation: 'Immutable meal evaluation snapshots used by the existing adherence projection.' },
    ];
    if (adherence.targetProvenance != null) {
      evidence.push({ id: `${context.contextId}-carbohydrates-provenance`, kind: 'policy', source, field: 'diabetesCarbohydrateAdherence.targetProvenance', value: `${adherence.targetProvenance.policyId}:${adherence.targetProvenance.version}`, explanation: `${adherence.targetProvenance.source} (${adherence.targetProvenance.version}) governs the individualized carbohydrate target.` });
    }
    return evidence;
  }

  private candidate(recommendation: Recommendation, conflictKey: RecommendationConflictKey, priority: number, specificity: number): RecommendationCandidate {
    return { candidateId: recommendation.id, recommendation, conflictKey, priority, specificity };
  }
}
