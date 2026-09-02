import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { RecommendationResolution } from '../types/recommendation-resolver.type.js';
import { Recommendation } from '../types/recommendation.type.js';
import { RecommendationResolutionResponseDto, CurrentMealRecommendationItemDto, CurrentMealRecommendationsResponseDto, RecommendationEvaluationDayDto, RecommendationEvaluationMetadataDto } from '../dto/recommendation-response.dto.js';
import { DailyNutritionResponseMapper } from '../../analysis/mappers/controller/daily-nutrition-response.mapper.js';
import { DailyAdherenceByPolicyDto, DailyAdherenceDto, MealAssessmentDto, NutritionPolicyDeferralDto } from '../../analysis/dto/daily-nutrition-response.dto.js';
import type { DailyAdherenceSource } from '../../analysis/types/daily-adherence.source.js';

export class RecommendationResponseMapper {
  static toCurrentFoodResponse(snapshot: MealEvaluationSnapshotSource, resolution: RecommendationResolution): RecommendationResolutionResponseDto {
    return this.toResolutionResponse(`recommendations-${snapshot.id}`, snapshot.evaluatedAt.toISOString(), 'current-food', resolution);
  }
  static toDailyResponse(userId: string, date: string, resolution: RecommendationResolution): RecommendationResolutionResponseDto {
    return this.toResolutionResponse(`recommendations-daily-${userId}-${date}`, `${date}T23:59:59.999Z`, 'daily', resolution);
  }
  static toHistoricalResponse(userId: string, startDate: string, endDate: string, resolution: RecommendationResolution): RecommendationResolutionResponseDto {
    return { ...this.toResolutionResponse(`recommendations-historical-${userId}-${startDate}-${endDate}`, `${endDate}T23:59:59.999Z`, 'historical', resolution), evaluationMode: 'historical-replay' };
  }
  static toWeeklyResponse(userId: string, startDate: string, endDate: string, resolution: RecommendationResolution): RecommendationResolutionResponseDto {
    return this.toResolutionResponse(`recommendations-weekly-${userId}-${startDate}-${endDate}`, `${endDate}T23:59:59.999Z`, 'weekly', resolution);
  }
  static toCurrentMealResponse(mealId: string, items: readonly { snapshot: MealEvaluationSnapshotSource; resolution: RecommendationResolution }[]): CurrentMealRecommendationsResponseDto {
    return { apiVersion: 'v1', scope: 'current-meal', mealId, items: items.map(({ snapshot, resolution }): CurrentMealRecommendationItemDto => ({ mealItemId: snapshot.mealItemId, snapshotId: snapshot.id, resolution: this.toResolutionResponse(`recommendations-${snapshot.id}`, snapshot.evaluatedAt.toISOString(), 'current-meal', resolution) })) };
  }
  private static toResolutionResponse(contextId: string, asOf: string, scope: string, resolution: RecommendationResolution): RecommendationResolutionResponseDto {
    return {
      apiVersion: 'v1',
      scope,
      contextId,
      asOf,
      ...(resolution.evaluation == null ? {} : { evaluation: this.toEvaluationMetadata(resolution.evaluation) }),
      recommendations: resolution.selected.map((recommendation) => this.toRecommendation(recommendation)),
      suppressed: resolution.suppressed.map((suppression) => ({ ...suppression })),
    };
  }

  private static toEvaluationMetadata(source: NonNullable<RecommendationResolution['evaluation']>): RecommendationEvaluationMetadataDto {
    const dailyAdherence = source.dailyAdherence == null ? undefined : this.toDailyAdherenceDto(source.dailyAdherence);
    const dailyAdherenceByPolicy: readonly DailyAdherenceByPolicyDto[] | undefined = source.dailyAdherenceByPolicy == null
      ? undefined
      : source.dailyAdherenceByPolicy.map((adherence) => ({ ...this.toDailyAdherenceDto(adherence), policyId: adherence.policyId, policyVersion: adherence.policyVersion, target: adherence.target, measurementKey: adherence.measurementKey, ruleKind: adherence.ruleKind }));
    const mealAssessments: readonly MealAssessmentDto[] | undefined = source.mealAssessments == null
      ? undefined
      : source.mealAssessments.map((assessment) => DailyNutritionResponseMapper.toMealAssessmentDto(assessment, assessment.mealId));
    const toDay = (day: NonNullable<NonNullable<RecommendationResolution['evaluation']>['mealAssessmentsByDate']>[number]): RecommendationEvaluationDayDto => ({
      date: day.date,
      ...(day.mealAssessments == null ? {} : { mealAssessments: day.mealAssessments.map((assessment) => DailyNutritionResponseMapper.toMealAssessmentDto(assessment, assessment.mealId)) }),
      ...(day.dailyAdherence == null ? {} : { dailyAdherence: {
        ...this.toDailyAdherenceDto(day.dailyAdherence),
      } }),
      ...(day.dailyAdherenceByPolicy == null ? {} : { dailyAdherenceByPolicy: day.dailyAdherenceByPolicy.map((adherence) => ({
        ...this.toDailyAdherenceDto(adherence),
        policyId: adherence.policyId,
        policyVersion: adherence.policyVersion,
        target: adherence.target,
        measurementKey: adherence.measurementKey,
        ruleKind: adherence.ruleKind,
      })) }),
    });
    return {
      ...(source.evaluationMode == null ? {} : { evaluationMode: source.evaluationMode }),
      ...(source.evaluationStatus == null ? {} : { evaluationStatus: source.evaluationStatus }),
      ...(source.coverage == null ? {} : { coverage: source.coverage }),
      ...(dailyAdherence == null ? {} : { dailyAdherence }),
      ...(dailyAdherenceByPolicy == null ? {} : { dailyAdherenceByPolicy }),
      ...(source.targetProvenance == null ? {} : { targetProvenance: source.targetProvenance.map((provenance) => ({ ...provenance })) }),
      ...(mealAssessments == null ? {} : { mealAssessments }),
      ...(source.mealAssessmentsByDate == null ? {} : { mealAssessmentsByDate: source.mealAssessmentsByDate.map(toDay) }),
      deferredPolicies: source.deferredPolicies.map((policy): NutritionPolicyDeferralDto => ({ ...policy })),
      snapshotIds: [...source.snapshotIds],
      evaluatorVersions: [...source.evaluatorVersions],
      policySetFingerprints: [...source.policySetFingerprints],
      snapshotFingerprints: [...source.snapshotFingerprints],
      replayLimitations: [...source.replayLimitations],
    };
  }

  private static toDailyAdherenceDto(source: DailyAdherenceSource): DailyAdherenceDto {
    return {
      ...source,
      ...(source.targetProvenance == null ? {} : { targetProvenance: { ...source.targetProvenance } }),
      ...(source.deferredPolicy == null ? {} : { deferredPolicy: { ...source.deferredPolicy } }),
      snapshotIds: [...source.snapshotIds],
    };
  }
  private static toRecommendation(source: Recommendation) {
    return { ...source, evidence: source.evidence.map((evidence) => ({ ...evidence, source: { ...evidence.source } })), policy: { ...source.policy }, ...(source.limitations == null ? {} : { limitations: [...source.limitations] }), ...(source.actions == null ? {} : { actions: [...source.actions] }) };
  }
}
