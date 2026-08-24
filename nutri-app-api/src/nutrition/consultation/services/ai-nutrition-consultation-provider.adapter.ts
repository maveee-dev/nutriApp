import { Injectable } from '@nestjs/common';
import { AiService } from '../../../ai/ai.service.js';
import type { ConsultationPrompt } from '../../../ai/dto/consultation-prompt.dto.js';
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

  return {
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
    foodEvaluation: null,
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
      adherence: evaluation?.dailyAdherence == null ? [] : [{
        measurementKey: 'daily-adherence',
        status: evaluation.dailyAdherence.status,
        targetValue: evaluation.dailyAdherence.targetValue,
        consumedValue: evaluation.dailyAdherence.consumedValue,
        remainingValue: evaluation.dailyAdherence.remainingValue,
        exceededValue: evaluation.dailyAdherence.exceededValue,
        coveragePercentage: evaluation.dailyAdherence.coveragePercentage,
      }],
      replayLimitations: evaluation?.replayLimitations ?? [],
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
