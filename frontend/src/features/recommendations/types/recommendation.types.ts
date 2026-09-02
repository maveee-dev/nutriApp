import type { FoodEvaluationResponse, FoodNutritionInsight } from '@/features/food-evaluation/types/evaluation.types';

export type RecommendationGoal = 'BALANCED' | 'HIGHER_PROTEIN' | 'HIGHER_FIBER' | 'LOWER_SODIUM' | 'LOWER_PHOSPHORUS' | 'LOWER_POTASSIUM' | 'ENERGY_SUPPORT' | 'HEART_HEALTHY';
export type RecommendationMealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface RecommendationQuery {
  goal?: RecommendationGoal;
  mealType?: RecommendationMealType;
  date?: string;
  limit?: number;
}

export interface RecommendationBudgetImpact {
  nutrient: string;
  amount: string;
  unit: string;
  target: string | null;
  remainingBefore: string | null;
  remainingAfter: string | null;
  targetConfigured: boolean;
}

export interface RecommendationHighlight {
  nutrient: string;
  amount: string;
  unit: string;
}

export interface PersonalizedRecommendationFood {
  foodId: string;
  canonicalName: string;
  displayName: string;
  variantLabel: string | null;
  category: string;
  servingId: string;
  servingName: string;
  servingGrams: string;
  quantity: string;
  compatibilityScore: number;
  coverage: number;
  evaluationStatus: 'evaluated' | 'insufficient-evidence';
  remainingBudgetImpact: RecommendationBudgetImpact[];
  nutritionHighlights: RecommendationHighlight[];
  whyRecommended: string;
  limitations: string[];
  nutritionInsights: FoodNutritionInsight[];
  evaluation: FoodEvaluationResponse;
}

export interface PersonalizedRecommendationRecipe {
  recipeId: string;
  recipeVersionId: string;
  name: string;
  servingName: string;
  servingGrams: string;
  quantity: string;
  compatibilityScore: number;
  coverage: number;
  evaluationStatus: 'evaluated' | 'insufficient-evidence';
  remainingBudgetImpact: RecommendationBudgetImpact[];
  nutritionHighlights: RecommendationHighlight[];
  whyRecommended: string;
  limitations: string[];
  nutritionInsights: FoodNutritionInsight[];
  evaluation: FoodEvaluationResponse;
}

export interface RecommendationBudgetItem {
  current: string | null;
  target: string | null;
  remaining: string | null;
  unit: string;
  status: string;
}

export interface PersonalizedRecommendationResponse {
  date: string;
  goal: RecommendationGoal;
  mealType: RecommendationMealType | null;
  recommendations: PersonalizedRecommendationFood[];
  recipeRecommendations?: PersonalizedRecommendationRecipe[];
  remainingBudget: Record<string, RecommendationBudgetItem>;
  laboratoryConsiderations: string[];
  profileConsiderations: string[];
  limitations: string[];
  provenance: {
    foodSource: string;
    selection: string;
    evaluatorVersion: string;
    policySetFingerprint: string | null;
    activeTargetIds: string[];
  };
}
