import type { NutritionTargetCalculation } from '../../analysis/types/nutrition-targets.type.js';
import type { FoodEvaluationSource } from '../../evaluation/types/food-evaluation.type.js';
import type { MealAssessmentSource } from '../../analysis/types/meal-assessment.type.js';

export interface RecipeEvaluationComponentSource {
  readonly componentId: string;
  readonly foodId: string;
  readonly servingId: string | null;
  readonly quantity: string;
  readonly unit: string;
  readonly portionGrams: string;
  readonly evaluation: FoodEvaluationSource;
}

export interface RecipeCanonicalFoodProvenance {
  readonly foodId: string;
  readonly servingId: string | null;
  readonly servingGrams: string | null;
  readonly source: string;
  readonly sourceId: string | null;
  readonly nutrientFingerprint: string;
}

export interface RecipeEvaluationSource {
  readonly recipeId: string;
  readonly recipeVersionId: string;
  readonly recipeVersion: number;
  readonly portionGrams: string;
  readonly evaluation: FoodEvaluationSource;
  /** Aggregate meal-fit projection produced by the evaluation layer. */
  readonly mealAssessment?: MealAssessmentSource;
  readonly targetCalculation: NutritionTargetCalculation;
  readonly components: readonly RecipeEvaluationComponentSource[];
  readonly provenance: {
    readonly evaluatorVersion: string;
    readonly policySetFingerprint: string | null;
    readonly recipeFingerprint: string;
    readonly canonicalFoods: readonly RecipeCanonicalFoodProvenance[];
  };
  readonly limitations: readonly string[];
}
