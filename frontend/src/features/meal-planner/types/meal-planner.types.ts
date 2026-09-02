import type { FoodEvaluationResponse, FoodNutritionInsight } from '@/features/food-evaluation/types/evaluation.types';

export type MealPlannerMealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type MealPlannerFocus = 'BALANCED' | 'LOW_SODIUM' | 'HIGH_PROTEIN' | 'HIGH_FIBER' | 'CALORIE_BUDGET';

export interface MealPlannerRequest {
  date?: string;
  mealType?: MealPlannerMealType;
  focus?: MealPlannerFocus;
  caloriesRemaining?: string;
  limit?: number;
  includeExplanation?: boolean;
}

export interface MealPlannerBudgetItem {
  current: string | null;
  target: string | null;
  remaining: string | null;
  unit: string;
  status: string;
}

export interface MealPlannerFood {
  foodId: string;
  name: string;
  displayName: string;
  variantLabel: string | null;
  servingId: string;
  servingName: string;
  servingGrams: string;
  quantity: string;
  score: number;
  coverage: number;
  evaluationStatus: 'evaluated' | 'insufficient-evidence';
  keyNutrients: { nutrient: string; amount: string; unit: string }[];
  evaluation: FoodEvaluationResponse;
  nutritionInsights: FoodNutritionInsight[];
  category: string;
}

export interface MealPlannerRecipe {
  recipeId: string;
  recipeVersionId: string;
  name: string;
  servingName: string;
  servingGrams: string;
  quantity: string;
  score: number;
  coverage: number;
  evaluationStatus: 'evaluated' | 'insufficient-evidence';
  keyNutrients: { nutrient: string; amount: string; unit: string }[];
  evaluation: FoodEvaluationResponse;
  nutritionInsights: FoodNutritionInsight[];
  limitations: string[];
}

export interface MealPlannerResponse {
  date: string;
  mealType: MealPlannerMealType;
  focus: MealPlannerFocus;
  foods: MealPlannerFood[];
  recipes?: MealPlannerRecipe[];
  summary: Record<string, { amount: string; unit: string }>;
  remainingBudget: Record<string, MealPlannerBudgetItem>;
  limitations: string[];
  provenance: {
    foodSource: string;
    selection: string;
    evaluatorVersion: string;
    policySetFingerprint: string | null;
  };
  aiExplanation?: { answer: string; providerId: string };
}
