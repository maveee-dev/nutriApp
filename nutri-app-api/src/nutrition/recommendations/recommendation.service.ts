import { Inject, Injectable } from '@nestjs/common';
import { MealEvaluationSnapshotSource } from '../../meals/sources/meal-evaluation-snapshot.source.js';
import { DailyNutritionSummarySource } from '../analysis/types/daily-nutrition-summary.source.js';
import { snapshotEvidenceSource } from './services/meal-evaluation-snapshot.adapter.js';
import { DeterministicRecommendationResolver } from './services/deterministic-recommendation.resolver.js';
import { createRecommendationPolicyRegistrations } from './recommendation-registrations.js';
import { RECOMMENDATION_POLICY_REGISTRATIONS } from './recommendation.tokens.js';
import { AnyRecommendationPolicyRegistration } from './types/recommendation-registration.type.js';
import { RecommendationContext } from './types/recommendation-context.type.js';
import { RecommendationResolution } from './types/recommendation-resolver.type.js';
import { RecommendationScope } from './types/recommendation.type.js';
import { RecommendationEvaluationDay, RecommendationEvaluationMetadata } from './types/recommendation-evaluation.type.js';
import { decodeMealEvaluationSnapshot } from '../../meals/snapshots/meal-evaluation-snapshot.adapter.js';

@Injectable()
export class RecommendationService {
  constructor(
    @Inject(RECOMMENDATION_POLICY_REGISTRATIONS)
    private readonly registrations: readonly AnyRecommendationPolicyRegistration[] = createRecommendationPolicyRegistrations(),
    @Inject(DeterministicRecommendationResolver)
    private readonly resolver = new DeterministicRecommendationResolver(),
  ) {}

  recommend(
    userId: string,
    snapshot: MealEvaluationSnapshotSource,
    scope: RecommendationScope = 'current-food',
  ): RecommendationResolution {
    return this.resolveRecommendations(userId, snapshot, scope, {
      contextId: `recommendations-${snapshot.id}`,
      asOf: snapshot.evaluatedAt.toISOString(),
      sources: [snapshotEvidenceSource(snapshot)],
    });
  }

  recommendDaily(userId: string, summary: DailyNutritionSummarySource): RecommendationResolution {
    const source = { sourceType: 'daily-summary' as const, sourceId: `${userId}:${summary.date}`, version: 'nutrition-analysis-v1' };
    return this.resolveRecommendations(userId, summary, 'daily', {
      contextId: `recommendations-daily-${userId}-${summary.date}`,
      asOf: `${summary.date}T23:59:59.999Z`,
      sources: [source],
    });
  }

  recommendHistorical(userId: string, summaries: readonly DailyNutritionSummarySource[]): RecommendationResolution {
    const dates = summaries.map(({ date }) => date).sort();
    const start = dates[0] ?? 'unknown';
    const end = dates[dates.length - 1] ?? 'unknown';
    return this.resolveRecommendations(userId, summaries, 'historical', {
      contextId: `recommendations-historical-${userId}-${start}-${end}`,
      asOf: `${end}T23:59:59.999Z`,
      sources: [{ sourceType: 'historical-summary', sourceId: `historical:${userId}:${start}:${end}`, version: 'nutrition-analysis-v1' }],
    });
  }

  recommendWeekly(userId: string, summaries: readonly DailyNutritionSummarySource[], startDate: string, endDate: string): RecommendationResolution {
    return this.resolveRecommendations(userId, summaries, 'weekly', {
      contextId: `recommendations-weekly-${userId}-${startDate}-${endDate}`,
      asOf: `${endDate}T23:59:59.999Z`,
      sources: [{ sourceType: 'weekly-summary', sourceId: `weekly:${userId}:${startDate}:${endDate}`, version: 'nutrition-analysis-v1' }],
    });
  }

  private resolveRecommendations(
    userId: string,
    projection: unknown,
    scope: RecommendationScope,
    metadata: Pick<RecommendationContext, 'contextId' | 'asOf' | 'sources'>,
  ): RecommendationResolution {
    const baseContext: RecommendationContext = {
      ...metadata,
      userId,
      scope,
      projection,
    };

    const candidates = this.registrations
      .filter(({ policy }) => policy.scopes.includes(scope))
      .flatMap((registration) => {
        const context = registration.buildContext(baseContext);
        return registration.policy.evaluate(context);
      });

    const resolution = this.resolver.resolve(baseContext, candidates);
    const evaluation = this.evaluationMetadata(projection, scope);
    return {
      ...resolution,
      ...(evaluation == null ? {} : { evaluation }),
    };
  }

  private evaluationMetadata(projection: unknown, _scope: RecommendationScope): RecommendationEvaluationMetadata | undefined {
    if (this.isSnapshot(projection)) {
      const payload = decodeMealEvaluationSnapshot(projection);
      return {
        ...(payload.evaluationStatus == null ? {} : { evaluationStatus: payload.evaluationStatus }),
        coverage: projection.coverage,
        ...(payload.targetProvenance == null ? {} : { targetProvenance: payload.targetProvenance }),
        deferredPolicies: [...payload.deferredPolicies],
        snapshotIds: [projection.id],
        evaluatorVersions: [projection.evaluatorVersion],
        policySetFingerprints: payload.policySetFingerprint == null ? [] : [payload.policySetFingerprint],
        snapshotFingerprints: payload.snapshotFingerprint == null ? [] : [payload.snapshotFingerprint],
        replayLimitations: [],
      };
    }

    const summaries = Array.isArray(projection) ? projection : [projection];
    const dailySummaries = summaries.filter(this.isDailySummary);
    if (dailySummaries.length === 0) return undefined;
    const modes = [...new Set(dailySummaries.map(({ evaluationMode }) => evaluationMode).filter((mode): mode is NonNullable<typeof mode> => mode != null))];
    const snapshotIds = [...new Set(dailySummaries.flatMap(({ snapshotIds: ids }) => ids ?? []))];
    const mealAssessments = dailySummaries.flatMap(({ mealAssessments: assessments }) => assessments ?? []);
    const dailyAdherence = dailySummaries.length === 1 ? dailySummaries[0]?.dailyAdherence : undefined;
    const dailyAdherenceByPolicy = dailySummaries.length === 1 ? dailySummaries[0]?.dailyAdherenceByPolicy : undefined;
    const evaluationDays: readonly RecommendationEvaluationDay[] = dailySummaries.map((summary) => ({
      date: summary.date,
      ...(summary.mealAssessments == null ? {} : { mealAssessments: summary.mealAssessments }),
      ...(summary.dailyAdherence == null ? {} : { dailyAdherence: summary.dailyAdherence }),
      ...(summary.dailyAdherenceByPolicy == null ? {} : { dailyAdherenceByPolicy: summary.dailyAdherenceByPolicy }),
    }));
    const deferredPolicies = uniqueByJson(dailySummaries.flatMap(({ deferredPolicies: policies }) => policies));
    const targetProvenance = uniqueByJson(dailySummaries.flatMap(({ targetProvenance: provenance }) => provenance ?? []));
    const evaluatorVersions = [...new Set([
      ...mealAssessments.map(({ evaluatorVersion }) => evaluatorVersion).filter((value): value is string => value != null),
      ...(dailyAdherence?.evaluatorVersion == null ? [] : [dailyAdherence.evaluatorVersion]),
      ...((dailyAdherenceByPolicy ?? []).flatMap(({ evaluatorVersion }) => evaluatorVersion == null ? [] : [evaluatorVersion])),
    ])].sort();
    const policySetFingerprints = [...new Set([
      ...dailySummaries.flatMap(({ policySetFingerprints: fingerprints }) => fingerprints ?? []),
      ...mealAssessments.map(({ policySetFingerprint }) => policySetFingerprint).filter((value): value is string => value != null),
      ...(dailyAdherence?.policySetFingerprint == null ? [] : [dailyAdherence.policySetFingerprint]),
      ...((dailyAdherenceByPolicy ?? []).flatMap(({ policySetFingerprint }) => policySetFingerprint == null ? [] : [policySetFingerprint])),
    ])].sort();
    const snapshotFingerprints: string[] = [];
    const replayLimitations = modes.length > 1 ? ['mixed-evaluation-modes'] : [];
    for (const assessment of mealAssessments) {
      for (const limitation of assessment.limitations) {
        replayLimitations.push(`${limitation.code}:${assessment.mealId}`);
      }
    }
    return {
      ...(modes.length === 1 ? { evaluationMode: modes[0] } : {}),
      ...(dailyAdherence == null ? {} : { dailyAdherence }),
      ...(dailyAdherenceByPolicy == null || dailyAdherenceByPolicy.length === 0 ? {} : { dailyAdherenceByPolicy }),
      ...(targetProvenance.length === 0 ? {} : { targetProvenance }),
      ...(mealAssessments.length === 0 ? {} : { mealAssessments }),
      ...(evaluationDays.length === 0 ? {} : { mealAssessmentsByDate: evaluationDays }),
      ...(dailySummaries.some(({ dailyAdherence: adherence, dailyAdherenceByPolicy: byPolicy }) => adherence != null || (byPolicy != null && byPolicy.length > 0)) ? { dailyAdherenceByDate: evaluationDays } : {}),
      deferredPolicies,
      snapshotIds,
      evaluatorVersions: [...new Set([
        ...evaluatorVersions,
        ...dailySummaries.flatMap(({ evaluatorVersions: versions }) => versions ?? []),
      ])].sort(),
      policySetFingerprints: [...new Set([
        ...policySetFingerprints,
        ...dailySummaries.flatMap(({ policySetFingerprints: fingerprints }) => fingerprints ?? []),
      ])].sort(),
      snapshotFingerprints: [...new Set(dailySummaries.flatMap(({ snapshotFingerprints: fingerprints }) => fingerprints ?? []))].sort(),
      replayLimitations: [...new Set(replayLimitations)],
    };
  }

  private isSnapshot(value: unknown): value is MealEvaluationSnapshotSource {
    return typeof value === 'object' && value != null && 'id' in value && 'mealItemId' in value && 'payload' in value && 'evaluatedAt' in value;
  }

  private isDailySummary(value: unknown): value is DailyNutritionSummarySource {
    return typeof value === 'object' && value != null && 'date' in value && 'deferredPolicies' in value && 'mealCount' in value;
  }
}

function uniqueByJson<T>(values: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
