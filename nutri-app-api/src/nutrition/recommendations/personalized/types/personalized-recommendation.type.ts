import type { FoodEvaluationSource } from '../../../evaluation/types/food-evaluation.type.js';
import type { NutritionInsight } from '../../../insights/types/nutrition-insight.type.js';

export const PERSONALIZED_RECOMMENDATION_GOALS = [
  'BALANCED',
  'HIGHER_PROTEIN',
  'HIGHER_FIBER',
  'LOWER_SODIUM',
  'LOWER_PHOSPHORUS',
  'LOWER_POTASSIUM',
  'ENERGY_SUPPORT',
  'HEART_HEALTHY',
] as const;

export type PersonalizedRecommendationGoal = (typeof PERSONALIZED_RECOMMENDATION_GOALS)[number];

export interface PersonalizedRecommendationBudgetImpact {
  readonly nutrient: string;
  readonly amount: string;
  readonly unit: string;
  readonly target: string | null;
  readonly remainingBefore: string | null;
  readonly remainingAfter: string | null;
  readonly targetConfigured: boolean;
}

export interface PersonalizedRecommendationHighlight {
  readonly nutrient: string;
  readonly amount: string;
  readonly unit: string;
}

export interface PersonalizedRecommendationFood {
  readonly foodId: string;
  readonly canonicalName: string;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly category: string;
  readonly servingId: string;
  readonly servingName: string;
  readonly servingGrams: string;
  readonly quantity: string;
  readonly compatibilityScore: number;
  readonly coverage: number;
  readonly evaluationStatus: 'evaluated' | 'insufficient-evidence';
  readonly remainingBudgetImpact: readonly PersonalizedRecommendationBudgetImpact[];
  readonly nutritionHighlights: readonly PersonalizedRecommendationHighlight[];
  readonly whyRecommended: string;
  readonly limitations: readonly string[];
  readonly nutritionInsights: readonly NutritionInsight[];
  readonly evaluation: FoodEvaluationSource;
}

export interface PersonalizedRecommendationRecipe {
  readonly recipeId: string;
  readonly recipeVersionId: string;
  readonly name: string;
  readonly servingName: string;
  readonly servingGrams: string;
  readonly quantity: string;
  readonly compatibilityScore: number;
  readonly coverage: number;
  readonly evaluationStatus: 'evaluated' | 'insufficient-evidence';
  readonly remainingBudgetImpact: readonly PersonalizedRecommendationBudgetImpact[];
  readonly nutritionHighlights: readonly PersonalizedRecommendationHighlight[];
  readonly whyRecommended: string;
  readonly limitations: readonly string[];
  readonly nutritionInsights: readonly NutritionInsight[];
  readonly evaluation: FoodEvaluationSource;
}

export interface PersonalizedRecommendationBudgetItem {
  readonly current: string | null;
  readonly target: string | null;
  readonly remaining: string | null;
  readonly unit: string;
  readonly status: string;
}

export interface PersonalizedRecommendationSource {
  readonly date: string;
  readonly goal: PersonalizedRecommendationGoal;
  readonly mealType: string | null;
  readonly recommendations: readonly PersonalizedRecommendationFood[];
  readonly recipeRecommendations?: readonly PersonalizedRecommendationRecipe[];
  readonly remainingBudget: Readonly<Record<string, PersonalizedRecommendationBudgetItem>>;
  readonly laboratoryConsiderations: readonly string[];
  readonly profileConsiderations: readonly string[];
  readonly limitations: readonly string[];
  readonly provenance: {
    readonly foodSource: string;
    readonly selection: string;
    readonly evaluatorVersion: string;
    readonly policySetFingerprint: string | null;
    readonly activeTargetIds: readonly string[];
  };
}
