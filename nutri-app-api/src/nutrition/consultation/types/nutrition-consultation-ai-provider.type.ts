import type { NutritionConsultationResponseDto } from '../dto/consultation-response.dto.js';

export interface NutritionConsultationConversationTurn {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface NutritionConsultationAiContext {
  readonly deterministicResponse: Readonly<NutritionConsultationResponseDto>;
  readonly conversation: readonly NutritionConsultationConversationTurn[];
}

export interface NutritionConsultationAiExplanation {
  readonly answer: string;
  readonly providerId: string;
  readonly refused?: boolean;
}

export interface NutritionConsultationAiProvider {
  explain(context: NutritionConsultationAiContext): Promise<NutritionConsultationAiExplanation | null>;
}
