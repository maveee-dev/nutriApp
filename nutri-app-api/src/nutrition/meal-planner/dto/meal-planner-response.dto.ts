import type { FoodEvaluationContribution, FoodEvaluationReason } from '../../evaluation/types/food-evaluation.type.js';
import type { NutritionInsight } from '../../insights/types/nutrition-insight.type.js';

export class MealPlannerBudgetItemDto {
  current!: string | null;
  target!: string | null;
  remaining!: string | null;
  unit!: string;
  status!: string;
}

export class MealPlannerNutrientTotalDto {
  amount!: string;
  unit!: string;
}

export class MealPlannerFoodDto {
  foodId!: string;
  name!: string;
  displayName!: string;
  variantLabel!: string | null;
  servingId!: string;
  servingName!: string;
  servingGrams!: string;
  quantity!: string;
  score!: number;
  coverage!: number;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence';
  keyNutrients!: readonly { nutrient: string; amount: string; unit: string }[];
  evaluation!: {
    score: number;
    coverage: number;
    evaluationStatus: 'evaluated' | 'insufficient-evidence';
    reasons: readonly FoodEvaluationReason[];
    contributions: readonly FoodEvaluationContribution[];
    deferredPolicies: readonly { policyId: string; reason: string; explanation: string }[];
  };
  nutritionInsights!: readonly NutritionInsight[];
  category!: string;
}

export class MealPlannerRecipeDto {
  recipeId!: string;
  recipeVersionId!: string;
  name!: string;
  servingName!: string;
  servingGrams!: string;
  quantity!: string;
  score!: number;
  coverage!: number;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence';
  keyNutrients!: readonly { nutrient: string; amount: string; unit: string }[];
  evaluation!: MealPlannerFoodDto['evaluation'];
  nutritionInsights!: readonly NutritionInsight[];
}

export class MealPlannerResponseDto {
  date!: string;
  mealType!: string;
  focus!: string;
  foods!: readonly MealPlannerFoodDto[];
  recipes?: readonly MealPlannerRecipeDto[];
  summary!: Record<string, MealPlannerNutrientTotalDto>;
  remainingBudget!: Record<string, MealPlannerBudgetItemDto>;
  limitations!: readonly string[];
  provenance!: {
    foodSource: string;
    selection: string;
    evaluatorVersion: string;
    policySetFingerprint: string | null;
  };
  aiExplanation?: { answer: string; providerId: string };
}
