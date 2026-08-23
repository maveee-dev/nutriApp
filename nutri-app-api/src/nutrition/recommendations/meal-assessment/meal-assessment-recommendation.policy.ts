import { RecommendationCandidate, recommendationConflictKey } from '../types/recommendation-candidate.type.js';
import type { RecommendationEvidence } from '../types/recommendation-evidence.type.js';
import type { RecommendationPolicy } from '../types/recommendation-policy.type.js';
import type { Recommendation } from '../types/recommendation.type.js';
import type { DailyMealAssessmentSource, MealAssessmentRuleResult } from '../../analysis/types/meal-assessment.type.js';
import type { MealAssessmentRecommendationContext } from './meal-assessment-recommendation.types.js';

export const MEAL_ASSESSMENT_RECOMMENDATION_POLICY_ID = 'meal-assessment-recommendation';
export const MEAL_ASSESSMENT_RECOMMENDATION_POLICY_VERSION = 'meal-assessment-recommendation-v1';

const POLICY_SOURCE = 'NutriApp meal assessment projection guidance';

/**
 * Composes existing meal-assessment results into user-facing guidance. It does
 * not calculate nutrients, resolve rules, or infer clinical meaning from
 * nutrient names. Rule status and explanation are supplied by the projection.
 */
export class MealAssessmentRecommendationPolicy implements RecommendationPolicy<MealAssessmentRecommendationContext['projection']> {
  readonly policyId = MEAL_ASSESSMENT_RECOMMENDATION_POLICY_ID;
  readonly version = MEAL_ASSESSMENT_RECOMMENDATION_POLICY_VERSION;
  readonly source = POLICY_SOURCE;
  readonly scopes = ['daily', 'weekly', 'historical'] as const;

  evaluate(context: MealAssessmentRecommendationContext): readonly RecommendationCandidate[] {
    return context.projection.summaries
      .flatMap((summary) => (summary.mealAssessments ?? []).flatMap((assessment) => this.assessmentCandidates(context, summary.date, assessment)));
  }

  private assessmentCandidates(context: MealAssessmentRecommendationContext, date: string, assessment: DailyMealAssessmentSource): readonly RecommendationCandidate[] {
    const exceeded = assessment.rules.find((rule) => rule.status === 'exceeded');
    if (exceeded != null) {
      return [
        this.candidate(this.recommendation(context, `${date}-${assessment.mealId}`, 'caution', 'Meal assessment needs attention', exceeded.explanation, this.evidence(context, date, assessment, exceeded)), recommendationConflictKey('meal-assessment', `${date}:${assessment.mealId}`, context.scope, 'caution'), 80),
        this.candidate(this.recommendation(context, `${date}-${assessment.mealId}`, 'improvement', 'Consider a better-fitting meal option', 'Review the meal assessment before your next meal and use the existing assessment details to guide your choice.', this.evidence(context, date, assessment, exceeded), ['Review the meal assessment details before choosing the next meal.']), recommendationConflictKey('meal-assessment', `${date}:${assessment.mealId}`, context.scope, 'improvement'), 70),
      ];
    }

    return [];
  }

  private evidence(context: MealAssessmentRecommendationContext, date: string, assessment: DailyMealAssessmentSource, rule: MealAssessmentRuleResult): readonly RecommendationEvidence[] {
    const source = {
      sourceType: context.scope === 'weekly' ? 'weekly-summary' as const : context.scope === 'historical' ? 'historical-summary' as const : 'daily-summary' as const,
      sourceId: context.contextId,
      version: 'nutrition-analysis-v1',
      ...(assessment.evaluatorVersion == null ? {} : { evaluatorVersion: assessment.evaluatorVersion }),
      ...(assessment.policySetFingerprint == null ? {} : { policySetFingerprint: assessment.policySetFingerprint }),
    };
    return [
      {
        id: `${context.contextId}-${date}-${assessment.mealId}-assessment`,
        kind: 'evaluation',
        source,
        field: `mealAssessments.${assessment.mealId}.status`,
        value: assessment.status,
        explanation: `Meal assessment result for ${date}.`,
      },
      {
        id: `${context.contextId}-${date}-${assessment.mealId}-${rule.rule.policyId}`,
        kind: 'policy',
        source,
        field: `mealAssessments.${assessment.mealId}.rules.${rule.rule.policyId}`,
        value: rule.measuredValue,
        unit: rule.rule.unit,
        explanation: rule.explanation,
      },
      ...(assessment.snapshotIds == null ? [] : [{
        id: `${context.contextId}-${date}-${assessment.mealId}-snapshots`,
        kind: 'snapshot' as const,
        source,
        field: `mealAssessments.${assessment.mealId}.snapshotIds`,
        value: assessment.snapshotIds.join(','),
        explanation: 'Immutable meal evaluation snapshots used by the meal assessment projection.',
      }]),
    ];
  }

  private recommendation(context: MealAssessmentRecommendationContext, idSuffix: string, category: 'caution' | 'improvement', title: string, message: string, evidence: readonly RecommendationEvidence[], actions?: readonly string[]): Recommendation {
    return {
      id: `${this.policyId}-${idSuffix}-${category}`,
      category,
      disposition: category === 'improvement' ? 'actionable' : 'informational',
      severity: 'moderate',
      scope: context.scope,
      title,
      message,
      evidence,
      policy: { policyId: this.policyId, version: this.version, source: this.source },
      ...(actions == null ? {} : { actions }),
    };
  }

  private candidate(recommendation: Recommendation, conflictKey: ReturnType<typeof recommendationConflictKey>, priority: number): RecommendationCandidate {
    return { candidateId: recommendation.id, recommendation, conflictKey, priority, specificity: 2 };
  }
}
