import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../../ai/ai.service.js';
import type { MealPlannerResponseSource } from '../types/meal-planner.type.js';
import { buildMealPlannerPrompt } from '../prompts/meal-planner.prompt.js';

@Injectable()
export class MealPlannerAiExplanationService {
  private readonly logger = new Logger(MealPlannerAiExplanationService.name);

  constructor(private readonly aiService: AiService) {}

  async explain(source: MealPlannerResponseSource): Promise<MealPlannerResponseSource['aiExplanation']> {
    try {
      const response = await this.aiService.generateConsultation(buildMealPlannerPrompt(source));
      return { answer: response.answer, providerId: response.providerId };
    } catch (error) {
      this.logger.warn(`Meal planner explanation unavailable: ${error instanceof Error ? error.message : 'provider error'}`);
      return undefined;
    }
  }
}
