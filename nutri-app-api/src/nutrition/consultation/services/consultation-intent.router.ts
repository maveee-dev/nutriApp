import { Injectable } from '@nestjs/common';
import type {
  NutritionConsultationLane,
  NutritionConsultationRoute,
} from '../types/consultation-route.type.js';

/**
 * Deterministic routing boundary for consultation requests.
 *
 * Rules are deliberately ordered. New lanes can be added by inserting a
 * classifier at the appropriate precedence point without changing the
 * consultation provider or evaluation pipeline.
 */
@Injectable()
export class ConsultationIntentRouter {
  route(
    question: string,
    conversation: readonly { role: 'user' | 'assistant'; content: string }[] = [],
  ): NutritionConsultationRoute {
    const normalizedQuestion = normalizeConsultationText(question);
    const recentContext = normalizeConsultationText(
      conversation
        .slice(-3)
        .map((turn) => turn.content)
        .join(' '),
    );
    const classificationText = `${normalizedQuestion} ${recentContext}`.trim();

    // Precedence is intentional: creator and calculation requests must not
    // be reclassified as general nutrition education.
    if (isCreatorQuestion(normalizedQuestion)) {
      return this.routeFor('creator', normalizedQuestion, 'never');
    }

    if (isCalculationRequest(normalizedQuestion)) {
      return this.routeFor('calculation', normalizedQuestion, 'never');
    }

    if (isUnrelatedRequest(normalizedQuestion, recentContext)) {
      return this.routeFor('unrelated', normalizedQuestion, 'never');
    }

    if (isLaboratoryQuestion(classificationText)) {
      return this.routeFor('lab-evidence', normalizedQuestion, 'optional');
    }

    if (isRecommendationQuestion(classificationText)) {
      return this.routeFor('recommendation', normalizedQuestion, 'optional');
    }

    if (isMealProgressQuestion(classificationText)) {
      return this.routeFor('meal-progress', normalizedQuestion, 'optional');
    }

    if (isFoodQuestion(classificationText)) {
      return this.routeFor('food', normalizedQuestion, 'optional');
    }

    if (isNutritionQuestion(classificationText)) {
      return this.routeFor('education', normalizedQuestion, 'optional');
    }

    return this.routeFor('unrelated', normalizedQuestion, 'never');
  }

  private routeFor(
    lane: NutritionConsultationLane,
    normalizedQuestion: string,
    aiPolicy: 'never' | 'optional',
  ): NutritionConsultationRoute {
    return { lane, aiPolicy, normalizedQuestion };
  }
}

export function normalizeConsultationText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCreatorQuestion(question: string): boolean {
  return /\b(?:who\s+(?:created|made|built)\s+(?:you|nutriapp)|who\s+is\s+your\s+(?:creator|developer)|who\s+was\s+your\s+creator|who\s+is\s+your\s+developer)\b/.test(question);
}

function isCalculationRequest(question: string): boolean {
  const calculationVerb = /\b(?:calculate|compute|estimate|work out|total up|how many|how much|what is the exact)\b/;
  const measurableValue = /\b(?:calories?|protein|carbohydrates?|carbs?|fat|sodium|potassium|phosphorus|cholesterol|nutrients?|compatibility|adherence|planner score|grams?|milligrams?|kcal)\b/;
  return calculationVerb.test(question) && measurableValue.test(question);
}

function isUnrelatedRequest(question: string, recentContext: string): boolean {
  if (/\b(?:programming|coding|code|homework|mathematics|math|politics|religion|entertainment|jokes?|roleplay|personal assistant|legal advice|financial advice|medical diagnosis|diagnos(?:e|is|ed)|what disease|am i sick)\b/.test(question)) {
    return true;
  }

  if (isNutritionQuestion(question) || isRecommendationQuestion(question)) return false;

  // A short follow-up can omit nutrition terms, but only inherits the
  // previous context when it is phrased as a conversational follow-up.
  return !(recentContext.length > 0 && isConversationalFollowUp(question) && isNutritionQuestion(recentContext));
}

function isNutritionQuestion(question: string): boolean {
  return /\b(?:nutrition|nutrient|food|meal|diet|eat|eating|protein|carbohydrates?|carbs?|fat|sodium|potassium|phosphorus|cholesterol|calories?|fiber|vitamins?|minerals?|sugar|serving|portion|recipe|cook|cooking|healthy|healthier|lab|laboratory|egfr|creatinine|glucose|diabetes|kidney|renal|dialysis|hypertension|blood pressure|recommendation|recommend|adherence|progress|goal|avoid|today|improve|explain|why|should)\b/.test(question);
}

function isFoodQuestion(question: string): boolean {
  return /\b(?:can i eat|is .* (?:good|healthy|okay|ok|safe)|tell me about|food|foods|eat|eating|ingredient|recipe|between|compare|versus|vs)\b/.test(question);
}

function isLaboratoryQuestion(question: string): boolean {
  return /\b(?:lab|laboratory|egfr|creatinine|bun|potassium result|phosphorus result|calcium result|albumin|hemoglobin|hematocrit|ferritin|iron|hba1c|a1c|fasting glucose|ldl|hdl|triglycerides?|cholesterol result|blood test|test result)\b/.test(question);
}

function isMealProgressQuestion(question: string): boolean {
  return /\b(?:meal|meals|logged|log|today|progress|adherence|consumed|intake|remaining|daily total|what did i eat|how did i do)\b/.test(question);
}

function isRecommendationQuestion(question: string): boolean {
  const explicitRecommendation = /\b(?:recommend|recommendation|what should i|what can i|what do i choose|next meal|avoid|guidance|suggest)\b/;
  const broadFoodRequest = /\b(?:healthy|good|best|great|recommended|suitable|appropriate)\s+(?:food|foods|meals?)\b/;
  const foodGoalRequest = /\b(?:food|foods|meals?)\s+(?:i|we)\s+(?:should|can|could|need to|ought to)\s+(?:eat|choose|have|include)\b/;
  const foodForUserRequest = /\b(?:food|foods|meals?)\s+for\s+(?:me|my)\b/;
  const foodChoiceRequest = /\bwhat\s+(?:food|foods|can i eat|should i eat|could i eat)\b/;
  const foodToEatRequest = /\b(?:food|foods|meals?)\s+to\s+(?:eat|choose|have|include)\b/;

  return explicitRecommendation.test(question)
    || broadFoodRequest.test(question)
    || foodGoalRequest.test(question)
    || foodForUserRequest.test(question)
    || foodChoiceRequest.test(question)
    || foodToEatRequest.test(question);
}

function isConversationalFollowUp(question: string): boolean {
  return /^(?:is it okay|is that okay|why|how about it|what about it|tell me more|can you explain|and what about)\b/.test(question);
}
