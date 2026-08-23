import { Inject, Injectable, Logger } from '@nestjs/common';
import { NutritionConsultationService } from './nutrition-consultation.service.js';
import { NUTRITION_CONSULTATION_AI_PROVIDER } from '../types/nutrition-consultation-ai.tokens.js';
import type { NutritionConsultationConversationTurn, NutritionConsultationAiProvider } from '../types/nutrition-consultation-ai-provider.type.js';
import { NutritionConsultationResponseDto } from '../dto/consultation-response.dto.js';

@Injectable()
export class AiNutritionConsultationService {
  private readonly logger = new Logger(AiNutritionConsultationService.name);

  constructor(
    private readonly deterministicService: NutritionConsultationService,
    @Inject(NUTRITION_CONSULTATION_AI_PROVIDER)
    private readonly provider: NutritionConsultationAiProvider,
  ) {}

  async consult(userId: string, question: string, requestedDate?: string, conversation: readonly NutritionConsultationConversationTurn[] = []): Promise<NutritionConsultationResponseDto> {
    const deterministicResponse = await this.deterministicService.consult(userId, question, requestedDate);
    try {
      const explanation = await this.provider.explain({ deterministicResponse, conversation });
      if (explanation == null || !this.isSafeExplanation(explanation.answer)) return deterministicResponse;
      return {
        ...deterministicResponse,
        assistantMode: 'ai-assisted',
        answer: explanation.answer,
        aiAssisted: true,
        aiProvider: explanation.providerId,
      };
    } catch (error) {
      this.logger.warn(`Consultation AI provider failed; using deterministic response. ${error instanceof Error ? error.message : String(error)}`);
      return deterministicResponse;
    }
  }

  private isSafeExplanation(answer: string): boolean {
    const normalized = answer.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
    if (normalized.length === 0 || normalized.length > 4_000) return false;
    // The provider explains approved decisions; it must not introduce
    // diagnosis, prescriptions, or medication dosing as new clinical output.
    return !/\b(diagnos(?:e|is|ed)|prescribe|prescription|medication dose|change your medication)\b/i.test(normalized);
  }
}
