import { Inject, Injectable, Logger } from '@nestjs/common';
import { NutritionConsultationService } from './nutrition-consultation.service.js';
import { NUTRITION_CONSULTATION_AI_PROVIDER } from '../types/nutrition-consultation-ai.tokens.js';
import type { NutritionConsultationConversationTurn, NutritionConsultationAiProvider } from '../types/nutrition-consultation-ai-provider.type.js';
import { NutritionConsultationResponseDto } from '../dto/consultation-response.dto.js';
import { ConsultationIntentRouter } from './consultation-intent.router.js';

const CREATOR_RESPONSE = 'I was created for NutriApp by Maverich Co., with the goal of providing evidence-based nutrition guidance.';
const CALCULATION_RESPONSE = 'I can explain nutrition values that NutriApp has already calculated, but I can\'t calculate or estimate nutrient amounts or clinical scores. Please use a food or meal evaluation with the available serving information.';
const UNRELATED_RESPONSE = 'I\'m NutriApp\'s nutrition assistant. I can help explain food choices, nutrition guidance, meals, and healthy eating. I can\'t help with programming, homework, legal, financial, medical diagnosis, or other unrelated topics.';

@Injectable()
export class AiNutritionConsultationService {
  private readonly logger = new Logger(AiNutritionConsultationService.name);

  constructor(
    private readonly deterministicService: NutritionConsultationService,
    @Inject(NUTRITION_CONSULTATION_AI_PROVIDER)
    private readonly provider: NutritionConsultationAiProvider,
    private readonly router: ConsultationIntentRouter = new ConsultationIntentRouter(),
  ) {}

  async consult(userId: string, question: string, requestedDate?: string, conversation: readonly NutritionConsultationConversationTurn[] = []): Promise<NutritionConsultationResponseDto> {
    const route = this.router.route(question, conversation);
    const deterministicResponse = await this.deterministicService.consult(userId, question, requestedDate);

    if (route.aiPolicy === 'never') {
      return this.withDeterministicRouteResponse(deterministicResponse, route.lane);
    }

    // Food evaluation is intentionally deferred to the next phase. Do not
    // ask Gemini to interpret an ambiguous or unresolved entity.
    if (route.lane === 'food' && deterministicResponse.foodResolution?.status !== 'resolved') {
      return deterministicResponse;
    }

    try {
      const explanation = await this.provider.explain({ deterministicResponse, conversation });
      if (explanation == null || !this.isSafeExplanation(explanation.answer)) return deterministicResponse;
      return {
        ...deterministicResponse,
        ...(explanation.refused ? { answer: explanation.answer } : {}),
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

  private withDeterministicRouteResponse(
    response: NutritionConsultationResponseDto,
    lane: 'creator' | 'calculation' | 'unrelated' | string,
  ): NutritionConsultationResponseDto {
    const answer = lane === 'creator'
      ? CREATOR_RESPONSE
      : lane === 'calculation'
        ? CALCULATION_RESPONSE
        : UNRELATED_RESPONSE;

    return {
      ...response,
      answer,
      assistantMode: 'deterministic-evidence',
      aiAssisted: false,
      aiProvider: undefined,
    };
  }

  private isSafeExplanation(answer: string): boolean {
    const normalized = answer.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
    if (normalized.length === 0 || normalized.length > 4_000) return false;
    // The provider explains approved decisions; it must not introduce
    // diagnosis, prescriptions, or medication dosing as new clinical output.
    return !/\b(diagnos(?:e|is|ed)|prescribe|prescription|medication dose|change your medication)\b/i.test(normalized);
  }
}
