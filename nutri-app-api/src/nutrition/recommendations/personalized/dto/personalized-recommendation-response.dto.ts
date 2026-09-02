import type { FoodEvaluationContribution, FoodEvaluationReason } from '../../../evaluation/types/food-evaluation.type.js';
import type { NutritionInsight } from '../../../insights/types/nutrition-insight.type.js';

export class PersonalizedRecommendationBudgetImpactDto {
  nutrient!: string;
  amount!: string;
  unit!: string;
  target!: string | null;
  remainingBefore!: string | null;
  remainingAfter!: string | null;
  targetConfigured!: boolean;
}

export class PersonalizedRecommendationHighlightDto {
  nutrient!: string;
  amount!: string;
  unit!: string;
}

export class PersonalizedRecommendationEvaluationDto {
  score!: number;
  coverage!: number;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence';
  reasons!: readonly FoodEvaluationReason[];
  contributions!: readonly FoodEvaluationContribution[];
  deferredPolicies!: readonly { policyId: string; reason: string; explanation: string }[];
}

export class PersonalizedRecommendationFoodDto {
  foodId!: string;
  canonicalName!: string;
  displayName!: string;
  variantLabel!: string | null;
  category!: string;
  servingId!: string;
  servingName!: string;
  servingGrams!: string;
  quantity!: string;
  compatibilityScore!: number;
  coverage!: number;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence';
  remainingBudgetImpact!: readonly PersonalizedRecommendationBudgetImpactDto[];
  nutritionHighlights!: readonly PersonalizedRecommendationHighlightDto[];
  whyRecommended!: string;
  limitations!: readonly string[];
  nutritionInsights!: readonly NutritionInsight[];
  evaluation!: PersonalizedRecommendationEvaluationDto;
}

export class PersonalizedRecommendationRecipeDto {
  recipeId!: string;
  recipeVersionId!: string;
  name!: string;
  servingName!: string;
  servingGrams!: string;
  quantity!: string;
  compatibilityScore!: number;
  coverage!: number;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence';
  remainingBudgetImpact!: readonly PersonalizedRecommendationBudgetImpactDto[];
  nutritionHighlights!: readonly PersonalizedRecommendationHighlightDto[];
  whyRecommended!: string;
  limitations!: readonly string[];
  nutritionInsights!: readonly NutritionInsight[];
  evaluation!: PersonalizedRecommendationFoodDto['evaluation'];
}

export class PersonalizedRecommendationBudgetItemDto {
  current!: string | null;
  target!: string | null;
  remaining!: string | null;
  unit!: string;
  status!: string;
}

export class PersonalizedRecommendationProvenanceDto {
  foodSource!: string;
  selection!: string;
  evaluatorVersion!: string;
  policySetFingerprint!: string | null;
  activeTargetIds!: readonly string[];
}

export class PersonalizedRecommendationResponseDto {
  date!: string;
  goal!: string;
  mealType!: string | null;
  recommendations!: readonly PersonalizedRecommendationFoodDto[];
  recipeRecommendations?: readonly PersonalizedRecommendationRecipeDto[];
  remainingBudget!: Record<string, PersonalizedRecommendationBudgetItemDto>;
  laboratoryConsiderations!: readonly string[];
  profileConsiderations!: readonly string[];
  limitations!: readonly string[];
  provenance!: PersonalizedRecommendationProvenanceDto;
}
