import { Decimal } from 'decimal.js';
import { DiabetesCarbohydrateAdherenceResult } from '../../analysis/policies/diabetes/diabetes-carbohydrate-adherence.policy.js';
import { RecommendationCandidate, recommendationConflictKey, RecommendationConflictKey } from '../types/recommendation-candidate.type.js';
import { RecommendationEvidence } from '../types/recommendation-evidence.type.js';
import { RecommendationPolicy } from '../types/recommendation-policy.type.js';
import { Recommendation } from '../types/recommendation.type.js';
import { HistoricalCarbohydrateAdherenceRecommendationContext } from './historical-carbohydrate-adherence-recommendation.types.js';
import { diabetesCarbohydrateAdherence } from './diabetes-adherence-projection.js';
import type { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';

export const DIABETES_HISTORICAL_CARBOHYDRATE_ADHERENCE_RECOMMENDATION_POLICY_ID = 'diabetes-historical-carbohydrate-adherence-recommendation';
export const DIABETES_HISTORICAL_CARBOHYDRATE_ADHERENCE_RECOMMENDATION_POLICY_VERSION = 'diabetes-historical-carbohydrate-adherence-recommendation-v1';

const POLICY_SOURCE = 'NutriApp approved diabetes historical carbohydrate adherence guidance';
const ADHERENCE_POLICY_ID = 'diabetes-carbohydrate-adherence-v1';

export class DiabetesHistoricalCarbohydrateAdherenceRecommendationPolicy implements RecommendationPolicy<HistoricalCarbohydrateAdherenceRecommendationContext['projection']> {
  readonly policyId = DIABETES_HISTORICAL_CARBOHYDRATE_ADHERENCE_RECOMMENDATION_POLICY_ID;
  readonly version = DIABETES_HISTORICAL_CARBOHYDRATE_ADHERENCE_RECOMMENDATION_POLICY_VERSION;
  readonly source = POLICY_SOURCE;
  readonly scopes = ['historical', 'weekly'] as const;

  evaluate(context: HistoricalCarbohydrateAdherenceRecommendationContext): readonly RecommendationCandidate[] {
    const summaries = [...context.projection.summaries].sort((left, right) => left.date.localeCompare(right.date));
    const deferrals = summaries.flatMap((summary) => [
      ...summary.deferredPolicies.filter(({ policyId }) => policyId === ADHERENCE_POLICY_ID),
      ...(diabetesCarbohydrateAdherence(summary)?.deferredPolicy == null ? [] : [diabetesCarbohydrateAdherence(summary)!.deferredPolicy!]),
    ]);
    if (deferrals.length > 0) {
      const deferred = deferrals[0];
      return [this.deferredCandidate(context, deferred.reason, deferred.explanation, summaries)];
    }

    const available = summaries
      .map((summary) => diabetesCarbohydrateAdherence(summary))
      .filter((adherence): adherence is DiabetesCarbohydrateAdherenceResult => adherence?.status === 'available' && adherence.targetCarbohydrateGrams != null && adherence.consumedCarbohydrateGrams != null);
    if (available.length < 2) {
      return summaries.length === 0 ? [] : [this.deferredCandidate(context, 'insufficient-historical-coverage', 'Historical carbohydrate adherence guidance is deferred because fewer than two complete daily adherence projections are available.', summaries)];
    }

    const evidence = this.evidence(context, summaries);
    const candidates: RecommendationCandidate[] = [];
    const exceededDays = available.filter((adherence) => this.isExceeded(adherence));
    if (exceededDays.length >= 2) {
      candidates.push(
        this.candidate(this.recommendation(context, 'caution', 'moderate', 'Carbohydrate target exceedances are recurring', `${exceededDays.length} of ${available.length} complete days exceeded the individualized carbohydrate target.`, evidence), recommendationConflictKey('nutrient', 'carbohydrates', context.scope, 'repeated-exceedance'), 80, 2),
        this.candidate(this.recommendation(context, 'improvement', 'moderate', 'Plan portions across the historical period', 'Review carbohydrate portions across meals to support more consistent adherence to the individualized target.', evidence, ['Use the daily target and remaining amount to plan upcoming portions.']), recommendationConflictKey('nutrient', 'carbohydrates', context.scope, 'improvement'), 70, 2),
      );
    } else if (exceededDays.length === 0) {
      candidates.push(this.candidate(this.recommendation(context, 'positive', 'low', 'Carbohydrate adherence has been consistent', `All ${available.length} complete days stayed within the individualized carbohydrate target.`, evidence), recommendationConflictKey('nutrient', 'carbohydrates', context.scope, 'consistent-adherence'), 50, 2));
    }

    const trend = this.trend(available);
    if (trend != null) {
      const improving = trend === 'improving';
      candidates.push(this.candidate(this.recommendation(context, improving ? 'positive' : 'caution', improving ? 'low' : 'moderate', improving ? 'Carbohydrate adherence is improving' : 'Carbohydrate adherence is declining', improving ? 'Recent daily adherence is closer to the individualized carbohydrate target than the earliest day in this period.' : 'Recent daily adherence is farther above the individualized carbohydrate target than the earliest day in this period.', evidence), recommendationConflictKey('nutrient', 'carbohydrates', context.scope, 'trend'), improving ? 45 : 75, 2));
    }
    return candidates;
  }

  private isExceeded(adherence: DiabetesCarbohydrateAdherenceResult): boolean { try { return new Decimal(adherence.exceededByGrams ?? '0').gt(0); } catch { return true; } }

  private trend(available: readonly DiabetesCarbohydrateAdherenceResult[]): 'improving' | 'declining' | null {
    const first = this.ratio(available[0]);
    const last = this.ratio(available[available.length - 1]);
    if (first == null || last == null || first.eq(last)) return null;
    return last.lt(first) ? 'improving' : 'declining';
  }

  private ratio(adherence: DiabetesCarbohydrateAdherenceResult): Decimal | null {
    try { const target = new Decimal(adherence.targetCarbohydrateGrams ?? ''); return target.isZero() ? null : new Decimal(adherence.consumedCarbohydrateGrams ?? '').div(target); } catch { return null; }
  }

  private recommendation(context: HistoricalCarbohydrateAdherenceRecommendationContext, category: Recommendation['category'], severity: Recommendation['severity'], title: string, message: string, evidence: readonly RecommendationEvidence[], actions?: readonly string[]): Recommendation {
    return { id: `diabetes-historical-carbohydrate-adherence-${category}-${title.toLowerCase().replaceAll(' ', '-')}`, category, disposition: category === 'improvement' ? 'actionable' : 'informational', severity, scope: context.scope, title, message, nutrient: 'carbohydrates', evidence, policy: { policyId: this.policyId, version: this.version, source: this.source }, ...(actions == null ? {} : { actions }) };
  }

  private deferredCandidate(context: HistoricalCarbohydrateAdherenceRecommendationContext, reason: string, message: string, summaries: readonly { date: string }[]): RecommendationCandidate {
    const recommendation: Recommendation = { id: `diabetes-historical-carbohydrate-adherence-deferred-${reason}`, category: 'deferred-policy', disposition: 'informational', severity: 'low', scope: context.scope, title: 'Historical carbohydrate adherence guidance is deferred', message, nutrient: 'carbohydrates', evidence: [{ id: `${context.contextId}-deferred-${reason}`, kind: 'policy-deferral', source: { sourceType: 'historical-summary', sourceId: context.contextId, version: 'nutrition-analysis-v1' }, field: 'deferredPolicies', value: reason, explanation: `${message} Period: ${summaries.map(({ date }) => date).join(', ')}.` }], policy: { policyId: this.policyId, version: this.version, source: this.source }, limitations: ['This message does not establish a diagnosis, prescribe treatment, or replace professional medical judgment.'] };
    return this.candidate(recommendation, recommendationConflictKey('policy', ADHERENCE_POLICY_ID, context.scope, 'deferred'), 20, 2);
  }

  private evidence(context: HistoricalCarbohydrateAdherenceRecommendationContext, summaries: readonly DailyNutritionSummarySource[]): readonly RecommendationEvidence[] {
    const source = { sourceType: 'historical-summary' as const, sourceId: context.contextId, version: 'nutrition-analysis-v1' };
    const evidence: RecommendationEvidence[] = [{ id: `${context.contextId}-period`, kind: 'summary', source, field: 'period', value: summaries.map(({ date }) => date).join(','), explanation: 'Daily nutrition summaries supplied for the historical recommendation period.' }];
    for (const summary of summaries) {
      const adherence = diabetesCarbohydrateAdherence(summary);
      if (adherence == null) continue;
      evidence.push({ id: `${context.contextId}-${summary.date}-consumed`, kind: 'summary', source, field: `${summary.date}.consumedCarbohydrateGrams`, value: adherence.consumedCarbohydrateGrams, unit: 'g', explanation: 'Consumed carbohydrate from the existing daily adherence projection.' });
      evidence.push({ id: `${context.contextId}-${summary.date}-snapshots`, kind: 'snapshot', source, field: `${summary.date}.snapshotIds`, value: adherence.snapshotIds.join(','), explanation: 'Immutable meal evaluation snapshots used by the daily adherence projection.' });
      if (adherence.targetProvenance != null) evidence.push({ id: `${context.contextId}-${summary.date}-provenance`, kind: 'policy', source, field: `${summary.date}.targetProvenance`, value: `${adherence.targetProvenance.policyId}:${adherence.targetProvenance.version}`, explanation: `${adherence.targetProvenance.source} (${adherence.targetProvenance.version}) governs the individualized target.` });
    }
    return evidence;
  }

  private candidate(recommendation: Recommendation, conflictKey: RecommendationConflictKey, priority: number, specificity: number): RecommendationCandidate { return { candidateId: recommendation.id, recommendation, conflictKey, priority, specificity }; }
}
