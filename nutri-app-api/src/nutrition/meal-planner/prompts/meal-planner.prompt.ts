import type { ConsultationPrompt } from '../../../ai/dto/consultation-prompt.dto.js';
import type { MealPlannerResponseSource } from '../types/meal-planner.type.js';

/**
 * Builds an allowlisted explanation request. The planner's deterministic
 * result is the only source of food, score, nutrient, and insight values.
 */
export function buildMealPlannerPrompt(source: MealPlannerResponseSource): ConsultationPrompt {
  return {
    consultationType: 'recommendation',
    userConditions: [],
    labSummary: [],
    foodEvaluation: null,
    dailySummary: {
      date: source.date,
      deferredPolicies: [],
      adherence: Object.entries(source.remainingBudget).map(([measurementKey, budget]) => ({
        measurementKey,
        status: budget.status,
        targetValue: budget.target,
        consumedValue: budget.current,
        remainingValue: budget.remaining,
        exceededValue: null,
        coveragePercentage: null,
      })),
      replayLimitations: [],
    },
    recommendations: source.foods.map((food) => ({
      category: 'meal-planner',
      disposition: 'selected',
      severity: food.evaluationStatus === 'evaluated' ? 'low' : 'informational',
      scope: 'meal',
      title: food.displayName,
      message: `Selected for ${source.mealType.toLowerCase()} planning with a deterministic compatibility score of ${food.score}.`,
      evidence: [
        { field: 'foodId', value: food.foodId, explanation: 'Stable catalog identity.' },
        { field: 'serving', value: food.servingName, unit: 'serving', explanation: 'Serving used for the evaluation.' },
        { field: 'compatibilityScore', value: food.score, explanation: 'Existing Food Evaluation result.' },
        { field: 'coverage', value: food.coverage, unit: 'percent', explanation: 'Existing evaluation coverage.' },
        ...food.keyNutrients.map((nutrient) => ({
          field: nutrient.nutrient,
          value: nutrient.amount,
          unit: nutrient.unit,
          explanation: 'Nutrient contribution from the existing Food Evaluation result.',
        })),
        ...food.nutritionInsights.map((insight) => ({
          field: `insight:${insight.category}`,
          value: insight.message,
          explanation: 'Deterministic Nutrition Insight accompanying the evaluation.',
        })),
      ],
    })),
    userQuestion: `Explain these deterministic ${source.mealType.toLowerCase()} meal recommendations in concise, patient-friendly language.`,
    conversation: [],
  };
}
