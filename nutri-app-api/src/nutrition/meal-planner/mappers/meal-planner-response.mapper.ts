import type { MealPlannerResponseDto } from '../dto/meal-planner-response.dto.js';
import type { MealPlannerResponseSource } from '../types/meal-planner.type.js';

export class MealPlannerResponseMapper {
  static toResponseDto(source: MealPlannerResponseSource): MealPlannerResponseDto {
    return {
      date: source.date,
      mealType: source.mealType,
      focus: source.focus,
      foods: source.foods.map((food) => ({
        foodId: food.foodId,
        name: food.name,
        displayName: food.displayName,
        variantLabel: food.variantLabel,
        servingId: food.servingId,
        servingName: food.servingName,
        servingGrams: food.servingGrams,
        quantity: food.quantity,
        score: food.score,
        coverage: food.coverage,
        evaluationStatus: food.evaluationStatus,
        keyNutrients: food.keyNutrients.map((nutrient) => ({ ...nutrient })),
        evaluation: {
          score: food.evaluation.score,
          coverage: food.evaluation.coverage,
          evaluationStatus: food.evaluation.evaluationStatus ?? 'evaluated',
          reasons: food.evaluation.reasons.map((reason) => ({ ...reason })),
          contributions: food.evaluation.contributions.map((contribution) => ({ ...contribution })),
          deferredPolicies: food.evaluation.deferredPolicies.map((policy) => ({ ...policy })),
        },
        nutritionInsights: food.nutritionInsights.map((insight) => ({
          ...insight,
          evidence: { ...insight.evidence },
        })),
        category: food.category,
      })),
      ...(source.recipes == null ? {} : {
        recipes: source.recipes.map((recipe) => ({
          recipeId: recipe.recipeId,
          recipeVersionId: recipe.recipeVersionId,
          name: recipe.name,
          servingName: recipe.servingName,
          servingGrams: recipe.servingGrams,
          quantity: recipe.quantity,
          score: recipe.score,
          coverage: recipe.coverage,
          evaluationStatus: recipe.evaluationStatus,
          keyNutrients: recipe.keyNutrients.map((nutrient) => ({ ...nutrient })),
          evaluation: {
            score: recipe.evaluation.score,
            coverage: recipe.evaluation.coverage,
            evaluationStatus: recipe.evaluation.evaluationStatus ?? 'evaluated',
            reasons: recipe.evaluation.reasons.map((reason) => ({ ...reason })),
            contributions: recipe.evaluation.contributions.map((contribution) => ({ ...contribution })),
            deferredPolicies: recipe.evaluation.deferredPolicies.map((policy) => ({ ...policy })),
          },
          nutritionInsights: recipe.nutritionInsights.map((insight) => ({ ...insight, evidence: { ...insight.evidence } })),
        })),
      }),
      summary: Object.fromEntries(Object.entries(source.summary).map(([key, value]) => [key, { ...value }])),
      remainingBudget: Object.fromEntries(Object.entries(source.remainingBudget).map(([key, value]) => [key, { ...value }])),
      limitations: [...source.limitations],
      provenance: { ...source.provenance },
      ...(source.aiExplanation == null ? {} : { aiExplanation: { ...source.aiExplanation } }),
    };
  }
}
