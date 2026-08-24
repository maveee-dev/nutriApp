import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER } from './ai.tokens.js';
import type { AiResponse } from './dto/ai-response.dto.js';
import type { ConsultationPrompt } from './dto/consultation-prompt.dto.js';
import type { AiProvider } from './providers/ai-provider.js';

export const AI_EDUCATIONAL_DISCLAIMER = 'This is educational nutrition information, not a diagnosis or a substitute for professional medical advice.';
export const AI_OUT_OF_SCOPE_MESSAGE = 'I’m NutriApp’s nutrition assistant. I can help explain food choices, nutrition guidance, meals, and healthy eating. I can’t help with programming, homework, legal, financial, medical diagnosis, or other unrelated topics.';
export const AI_CALCULATION_REFUSAL_MESSAGE = 'I can explain nutrition values that NutriApp has already calculated, but I can’t calculate or estimate nutrient amounts or clinical scores. Please use a food or meal evaluation with the available serving information.';

@Injectable()
export class AiService {
  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

  async generateConsultation(request: ConsultationPrompt): Promise<AiResponse> {
    const refusal = this.refusalFor(request);
    if (refusal != null) {
      return this.withDisclaimer({
        answer: refusal,
        providerId: 'nutriapp-safety-v1',
        refused: true,
      });
    }

    return this.withDisclaimer(await this.provider.generateConsultation(request));
  }

  private refusalFor(request: ConsultationPrompt): string | null {
    const normalized = request.userQuestion.trim().toLowerCase();
    const conversationContext = request.conversation.map((turn) => turn.content).join(' ').toLowerCase();
    const combined = `${normalized} ${conversationContext}`.trim();
    const nutritionSignal = /\b(nutrition|nutrient|food|meal|diet|eat|eating|protein|carbohydrate|carb|fat|sodium|potassium|phosphorus|cholesterol|calorie|fiber|vitamin|mineral|sugar|serving|portion|recipe|cook|cooking|healthy|healthier|lab|laboratory|egfr|blood sugar|glucose|diabetes|kidney|renal|dialysis|hypertension|blood pressure|recommendation|adherence|progress|goal)\b/i;

    if (normalized.length === 0 || !nutritionSignal.test(combined) || /\b(programming|coding|code|homework|mathematics|math|politics|religion|entertainment|jokes?|roleplay|personal assistant|legal advice|financial advice|medical diagnosis|diagnos(?:e|is|ed)|what disease|am i sick)\b/i.test(normalized)) {
      return AI_OUT_OF_SCOPE_MESSAGE;
    }

    if (/(calculate|compute|estimate|work out|total up|how many|how much|what is the exact).*(calor(?:ie|ies)|protein|carbohydrate|fat|sodium|potassium|phosphorus|cholesterol|nutrient|compatibility|adherence|planner score|grams?|milligrams?|kcal)/i.test(normalized)
      || /(calor(?:ie|ies)|protein|carbohydrate|fat|sodium|potassium|phosphorus|cholesterol).*(calculate|compute|estimate|work out|total up|how much|how many)/i.test(normalized)) {
      return AI_CALCULATION_REFUSAL_MESSAGE;
    }

    return null;
  }

  private withDisclaimer(response: AiResponse): AiResponse {
    const answer = response.answer.trim();
    if (answer.includes(AI_EDUCATIONAL_DISCLAIMER)) return { ...response, answer };
    return { ...response, answer: `${answer}\n\n${AI_EDUCATIONAL_DISCLAIMER}` };
  }
}
