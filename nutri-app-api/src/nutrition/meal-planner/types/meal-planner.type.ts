import type { AiResponse } from '../../../ai/dto/ai-response.dto.js';
import type { FoodEvaluationSource } from '../../evaluation/types/food-evaluation.type.js';
import type { NutritionInsight } from '../../insights/types/nutrition-insight.type.js';

export const MEAL_PLANNER_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;
export type MealPlannerMealType = (typeof MEAL_PLANNER_MEAL_TYPES)[number];

export const MEAL_PLANNER_FOCUSES = ['BALANCED', 'LOW_SODIUM', 'HIGH_PROTEIN', 'HIGH_FIBER', 'CALORIE_BUDGET'] as const;
export type MealPlannerFocus = (typeof MEAL_PLANNER_FOCUSES)[number];

export interface MealPlannerRemainingBudgetItem {
  readonly current: string | null;
  readonly target: string | null;
  readonly remaining: string | null;
  readonly unit: string;
  readonly status: string;
}

export type MealPlannerRemainingBudget = Readonly<Record<string, MealPlannerRemainingBudgetItem>>;

export interface MealPlannerKeyNutrient {
  readonly nutrient: string;
  readonly amount: string;
  readonly unit: string;
}

export interface MealPlannerFoodSource {
  readonly foodId: string;
  readonly name: string;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly servingId: string;
  readonly servingName: string;
  readonly servingGrams: string;
  readonly quantity: string;
  readonly score: number;
  readonly coverage: number;
  readonly evaluationStatus: 'evaluated' | 'insufficient-evidence';
  readonly keyNutrients: readonly MealPlannerKeyNutrient[];
  readonly evaluation: FoodEvaluationSource;
  readonly nutritionInsights: readonly NutritionInsight[];
  readonly category: string;
}

export interface MealPlannerRecipeSource {
  readonly recipeId: string;
  readonly recipeVersionId: string;
  readonly name: string;
  readonly servingName: string;
  readonly servingGrams: string;
  readonly quantity: string;
  readonly score: number;
  readonly coverage: number;
  readonly evaluationStatus: 'evaluated' | 'insufficient-evidence';
  readonly keyNutrients: readonly MealPlannerKeyNutrient[];
  readonly evaluation: FoodEvaluationSource;
  readonly nutritionInsights: readonly NutritionInsight[];
}

export interface MealPlannerNutrientTotal {
  readonly amount: string;
  readonly unit: string;
}

export type MealPlannerSummary = Readonly<Record<string, MealPlannerNutrientTotal>>;

export interface MealPlannerResponseSource {
  readonly date: string;
  readonly mealType: MealPlannerMealType;
  readonly focus: MealPlannerFocus;
  readonly foods: readonly MealPlannerFoodSource[];
  readonly recipes?: readonly MealPlannerRecipeSource[];
  readonly summary: MealPlannerSummary;
  readonly remainingBudget: MealPlannerRemainingBudget;
  readonly limitations: readonly string[];
  readonly provenance: {
    readonly foodSource: string;
    readonly selection: string;
    readonly evaluatorVersion: string;
    readonly policySetFingerprint: string | null;
  };
  readonly aiExplanation?: Pick<AiResponse, 'answer' | 'providerId'>;
}
