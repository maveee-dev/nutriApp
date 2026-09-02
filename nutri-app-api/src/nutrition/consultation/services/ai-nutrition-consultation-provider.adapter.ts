import { Injectable } from '@nestjs/common';
import { AiService } from '../../../ai/ai.service.js';
import type { ConsultationPrompt, ConsultationPromptTargetProvenance } from '../../../ai/dto/consultation-prompt.dto.js';
import type { NutritionConsultationResponseDto } from '../dto/consultation-response.dto.js';
import type {
  NutritionConsultationAiExplanation,
  NutritionConsultationAiContext,
  NutritionConsultationAiProvider,
} from '../types/nutrition-consultation-ai-provider.type.js';

@Injectable()
export class AiNutritionConsultationProviderAdapter implements NutritionConsultationAiProvider {
  constructor(private readonly aiService: AiService) {}

  async explain(context: NutritionConsultationAiContext): Promise<NutritionConsultationAiExplanation> {
    const response = await this.aiService.generateConsultation(toConsultationPrompt(context.deterministicResponse, context.conversation));
    return response;
  }
}

function toConsultationPrompt(
  response: NutritionConsultationResponseDto,
  conversation: NutritionConsultationAiContext['conversation'],
): ConsultationPrompt {
  const evaluation = response.recommendations.evaluation;
  const targetProvenance = evaluation?.targetProvenance ?? [];
  const foodEvaluation = response.foodEvaluation == null
    ? toRecipePromptEvaluation(response)
    : toPromptFoodEvaluation(response.foodEvaluation);

  return {
    consultationType: response.intent,
    userConditions: [...new Set(targetProvenance
      .map((item) => item.applicability?.conditionCode)
      .filter((value): value is string => value != null))],
    labSummary: response.laboratoryEvidence.map((result) => ({
      testCode: result.testCode,
      value: result.value,
      unit: result.unit,
      collectedAt: result.collectedAt,
      status: result.status,
      usedByPolicies: result.usedByPolicies.map((policy) => policy.policyId),
    })),
    foodEvaluation,
    dailySummary: {
      date: response.date,
      evaluationMode: response.recommendations.evaluationMode,
      evaluationStatus: evaluation?.evaluationStatus,
      coverage: evaluation?.coverage,
      deferredPolicies: (evaluation?.deferredPolicies ?? []).map((policy) => ({
        policyId: policy.policyId,
        reason: policy.reason,
        explanation: policy.explanation,
      })),
      adherence: evaluation?.dailyAdherenceByPolicy != null && evaluation.dailyAdherenceByPolicy.length > 0
        ? evaluation.dailyAdherenceByPolicy.map((adherence) => ({
          measurementKey: adherence.measurementKey,
          status: adherence.status,
          targetValue: adherence.targetValue,
          consumedValue: adherence.consumedValue,
          remainingValue: adherence.remainingValue,
          exceededValue: adherence.exceededValue,
          coveragePercentage: adherence.coveragePercentage,
        }))
        : evaluation?.dailyAdherence == null ? [] : [{
          measurementKey: 'daily-adherence',
          status: evaluation.dailyAdherence.status,
          targetValue: evaluation.dailyAdherence.targetValue,
          consumedValue: evaluation.dailyAdherence.consumedValue,
          remainingValue: evaluation.dailyAdherence.remainingValue,
          exceededValue: evaluation.dailyAdherence.exceededValue,
          coveragePercentage: evaluation.dailyAdherence.coveragePercentage,
        }],
      replayLimitations: evaluation?.replayLimitations ?? [],
      targetProvenance: targetProvenance.map(toPromptTargetProvenance),
      snapshotIds: evaluation?.snapshotIds,
      evaluatorVersions: evaluation?.evaluatorVersions,
      policySetFingerprints: evaluation?.policySetFingerprints,
    },
    recommendations: response.recommendations.recommendations.map((recommendation) => ({
      category: recommendation.category,
      disposition: recommendation.disposition,
      severity: recommendation.severity,
      scope: recommendation.scope,
      title: recommendation.title,
      message: recommendation.message,
      nutrient: recommendation.nutrient,
      evidence: recommendation.evidence.map((evidence) => ({
        field: evidence.field,
        value: evidence.value,
        unit: evidence.unit,
        explanation: evidence.explanation,
      })),
    })),
    userQuestion: response.question,
    conversation: conversation.map((turn) => ({ role: turn.role, content: turn.content })),
  };
}

function toRecipePromptEvaluation(response: NutritionConsultationResponseDto): NonNullable<ConsultationPrompt['foodEvaluation']> | null {
  const recipeEvaluation = response.recipeEvaluation;
  const candidate = response.foodResolution?.candidates[0];
  if (recipeEvaluation == null || candidate == null) return null;
  return {
    foodId: candidate.recipeId ?? candidate.stableId ?? '',
    displayName: candidate.displayName,
    variantLabel: candidate.variantLabel ?? null,
    serving: { name: '1 serving', grams: recipeEvaluation.portionGrams, quantity: '1' },
    evaluationStatus: recipeEvaluation.evaluation.evaluationStatus ?? 'evaluated',
    compatibilityScore: recipeEvaluation.evaluation.score,
    coverage: recipeEvaluation.evaluation.coverage,
    reasons: recipeEvaluation.evaluation.reasons.map((reason) => ({ nutrient: reason.nutrient, direction: reason.direction, measuredValue: reason.measuredValue, targetValue: reason.targetValue, explanation: reason.explanation })),
    contributions: recipeEvaluation.evaluation.contributions.map((contribution) => ({ nutrient: contribution.nutrient, amount: contribution.amount, unit: contribution.unit, targetValue: contribution.targetValue, currentDailyValue: contribution.currentDailyValue, explanation: contribution.explanation })),
    targets: recipeEvaluation.targetCalculation.targets,
    deferredPolicies: recipeEvaluation.evaluation.deferredPolicies.map((policy) => ({ ...policy })),
    targetProvenance: (recipeEvaluation.targetCalculation.targetProvenance ?? []).map(toPromptTargetProvenance),
    policySetFingerprint: recipeEvaluation.provenance.policySetFingerprint,
  };
}

function toPromptFoodEvaluation(foodEvaluation: NonNullable<NutritionConsultationResponseDto['foodEvaluation']>): NonNullable<ConsultationPrompt['foodEvaluation']> {
  return {
    foodId: foodEvaluation.foodId,
    displayName: foodEvaluation.displayName,
    variantLabel: foodEvaluation.variantLabel,
    serving: {
      name: foodEvaluation.serving.name,
      grams: foodEvaluation.serving.grams,
      quantity: foodEvaluation.serving.quantity,
    },
    evaluationStatus: foodEvaluation.evaluation.evaluationStatus ?? 'evaluated',
    compatibilityScore: foodEvaluation.evaluation.score,
    coverage: foodEvaluation.evaluation.coverage,
    reasons: foodEvaluation.evaluation.reasons.map((reason) => ({ nutrient: reason.nutrient, direction: reason.direction, measuredValue: reason.measuredValue, targetValue: reason.targetValue, explanation: reason.explanation })),
    contributions: foodEvaluation.evaluation.contributions.map((contribution) => ({ nutrient: contribution.nutrient, amount: contribution.amount, unit: contribution.unit, targetValue: contribution.targetValue, currentDailyValue: contribution.currentDailyValue, explanation: contribution.explanation })),
    targets: foodEvaluation.targetCalculation.targets,
    deferredPolicies: foodEvaluation.evaluation.deferredPolicies.map((policy) => ({ ...policy })),
    ...(foodEvaluation.evaluation.nutritionInsights == null ? {} : {
      nutritionInsights: foodEvaluation.evaluation.nutritionInsights.map((insight) => ({ category: insight.category, severity: insight.severity, title: insight.title, message: insight.message, evidence: { ...insight.evidence } })),
    }),
    targetProvenance: (foodEvaluation.targetCalculation.targetProvenance ?? []).map(toPromptTargetProvenance),
    policySetFingerprint: foodEvaluation.policySetFingerprint,
  };
}

function toPromptTargetProvenance(item: {
  readonly target: string;
  readonly policyId: string;
  readonly source: string;
  readonly sourceUrl?: string;
  readonly sourceVersion?: string;
  readonly version: string;
  readonly explanation: string;
  readonly applicability?: {
    readonly context: string;
    readonly conditionCode: string;
    readonly dialysisStatus: string | null;
    readonly laboratory?: {
      readonly testCode: string;
      readonly value: string;
      readonly unit: string;
      readonly collectedAt: string;
    };
  };
  readonly evidence?: {
    readonly evidenceId?: string;
    readonly evidenceVersion?: number;
    readonly approvalSource: string;
    readonly sourceReference: string | null;
    readonly effectiveAt?: string;
    readonly approvedAt: string;
    readonly expiresAt: string | null;
  };
}): ConsultationPromptTargetProvenance {
  return {
    target: item.target,
    policyId: item.policyId,
    source: item.source,
    ...(item.sourceUrl == null ? {} : { sourceUrl: item.sourceUrl }),
    ...(item.sourceVersion == null ? {} : { sourceVersion: item.sourceVersion }),
    version: item.version,
    explanation: item.explanation,
    ...(item.applicability == null ? {} : {
      applicability: {
        context: item.applicability.context,
        conditionCode: item.applicability.conditionCode,
        dialysisStatus: item.applicability.dialysisStatus,
        ...(item.applicability.laboratory == null ? {} : { laboratory: { ...item.applicability.laboratory } }),
      },
    }),
    ...(item.evidence == null ? {} : { evidence: { ...item.evidence } }),
  };
}
