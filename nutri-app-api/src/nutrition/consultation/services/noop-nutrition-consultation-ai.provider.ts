import { Injectable } from '@nestjs/common';
import type { NutritionConsultationAiContext, NutritionConsultationAiExplanation, NutritionConsultationAiProvider } from '../types/nutrition-consultation-ai-provider.type.js';

@Injectable()
export class NoopNutritionConsultationAiProvider implements NutritionConsultationAiProvider {
  explain(_context: NutritionConsultationAiContext): Promise<NutritionConsultationAiExplanation | null> {
    return Promise.resolve(null);
  }
}
