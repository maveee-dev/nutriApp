import { DailyAdherenceByPolicyDto, DailyNutritionResponseDto, MealAssessmentDto, WeeklyNutritionResponseDto } from '../../dto/daily-nutrition-response.dto.js';
import { MealAssessmentSource } from '../../types/meal-assessment.type.js';
import { DailyNutritionSummarySource, WeeklyNutritionSummarySource } from '../../types/daily-nutrition-summary.source.js';

export class DailyNutritionResponseMapper {
  static toResponseDto(
    source: DailyNutritionSummarySource,
  ): DailyNutritionResponseDto {
    return {
      date: source.date,
      mealCount: source.mealCount,
      totals: source.totals.map((total) => ({
        name: total.name,
        unit: total.unit,
        amount: total.amount,
      })),
      targets: { ...source.targets },
      insights: source.insights.map((insight) => ({ ...insight })),
      deferredPolicies: source.deferredPolicies.map((policy) => ({ ...policy })),
      caloriesConsumedKcal: source.caloriesConsumedKcal,
      remainingCaloriesKcal: source.remainingCaloriesKcal,
      calorieTargetPercentage: source.calorieTargetPercentage,
      ...(source.energyGoal == null ? {} : { energyGoal: source.energyGoal }),
      ...(source.targetProvenance == null ? {} : {
        targetProvenance: source.targetProvenance.map((provenance) => ({ ...provenance })),
      }),
      ...(source.diabetesCarbohydrateAdherence == null ? {} : {
        diabetesCarbohydrateAdherence: {
          ...source.diabetesCarbohydrateAdherence,
          ...(source.diabetesCarbohydrateAdherence.targetProvenance == null ? {} : {
            targetProvenance: { ...source.diabetesCarbohydrateAdherence.targetProvenance },
          }),
          ...(source.diabetesCarbohydrateAdherence.deferredPolicy == null ? {} : {
            deferredPolicy: { ...source.diabetesCarbohydrateAdherence.deferredPolicy },
          }),
          snapshotIds: [...source.diabetesCarbohydrateAdherence.snapshotIds],
        },
      }),
      ...(source.dailyAdherence == null ? {} : {
        dailyAdherence: {
          ...source.dailyAdherence,
          ...(source.dailyAdherence.targetProvenance == null ? {} : {
            targetProvenance: { ...source.dailyAdherence.targetProvenance },
          }),
          ...(source.dailyAdherence.deferredPolicy == null ? {} : {
            deferredPolicy: { ...source.dailyAdherence.deferredPolicy },
          }),
          snapshotIds: [...source.dailyAdherence.snapshotIds],
        },
      }),
      ...(source.dailyAdherenceByPolicy == null ? {} : {
        dailyAdherenceByPolicy: source.dailyAdherenceByPolicy.map((adherence): DailyAdherenceByPolicyDto => ({
          ...adherence,
          ...(adherence.targetProvenance == null ? {} : { targetProvenance: { ...adherence.targetProvenance } }),
          ...(adherence.deferredPolicy == null ? {} : { deferredPolicy: { ...adherence.deferredPolicy } }),
          snapshotIds: [...adherence.snapshotIds],
        })),
      }),
      ...(source.mealAssessments == null ? {} : {
        mealAssessments: source.mealAssessments.map((assessment) => this.toMealAssessmentDto(assessment, assessment.mealId)),
      }),
      ...(source.evaluationMode == null ? {} : { evaluationMode: source.evaluationMode }),
      ...(source.snapshotIds == null ? {} : { snapshotIds: [...source.snapshotIds] }),
      ...(source.evaluatorVersions == null ? {} : { evaluatorVersions: [...source.evaluatorVersions] }),
      ...(source.policySetFingerprints == null ? {} : { policySetFingerprints: [...source.policySetFingerprints] }),
      ...(source.snapshotFingerprints == null ? {} : { snapshotFingerprints: [...source.snapshotFingerprints] }),
    };
  }

  static toMealAssessmentDto(source: MealAssessmentSource, mealId?: string): MealAssessmentDto {
    return {
      ...(mealId == null ? {} : { mealId }),
      status: source.status,
      coverage: source.coverage,
      contributions: source.contributions.map((contribution) => ({ ...contribution })),
      rules: source.rules.map((result) => ({
        measuredValue: result.measuredValue,
        targetValue: result.targetValue,
        percentageOfTarget: result.percentageOfTarget,
        status: result.status,
        direction: result.direction,
        explanation: result.explanation,
        ...(result.limitationCode == null ? {} : { limitationCode: result.limitationCode }),
        rule: {
          family: result.rule.family,
          kind: result.rule.kind,
          roles: [...result.rule.roles],
          scopes: [...result.rule.scopes],
          measurementKey: result.rule.measurementKey,
          unit: result.rule.unit,
          weight: result.rule.weight,
          target: result.rule.target,
          targetValue: result.rule.targetValue,
          policyId: result.rule.policyId,
          policyVersion: result.rule.policyVersion,
          conflictKey: result.rule.conflictKey,
          precedence: result.rule.precedence,
          ...(result.rule.provenance == null ? {} : { provenance: { ...result.rule.provenance } }),
          ...(result.rule.supportingProvenance == null ? {} : {
            supportingProvenance: result.rule.supportingProvenance.map((provenance) => ({ ...provenance })),
          }),
        },
      })),
      deferredPolicies: source.deferredPolicies.map((policy) => ({ ...policy })),
      limitations: source.limitations.map((limitation) => ({
        code: limitation.code,
        explanation: limitation.explanation,
        ...(limitation.snapshotIds == null ? {} : { snapshotIds: [...limitation.snapshotIds] }),
        ...(limitation.evaluatorVersions == null ? {} : { evaluatorVersions: [...limitation.evaluatorVersions] }),
        ...(limitation.policySetFingerprints == null ? {} : { policySetFingerprints: [...limitation.policySetFingerprints] }),
      })),
      ...(source.snapshotIds == null ? {} : { snapshotIds: Array.from(source.snapshotIds) }),
      ...(source.evaluatorVersion == null ? {} : { evaluatorVersion: source.evaluatorVersion }),
      ...(source.policySetFingerprint == null ? {} : { policySetFingerprint: source.policySetFingerprint }),
      ...(source.evaluationFingerprint == null ? {} : { evaluationFingerprint: source.evaluationFingerprint }),
    };
  }

  static toWeeklyResponseDto(source: WeeklyNutritionSummarySource): WeeklyNutritionResponseDto {
    return {
      startDate: source.startDate,
      endDate: source.endDate,
      days: source.days.map((day) => this.toResponseDto(day)),
    };
  }
}
