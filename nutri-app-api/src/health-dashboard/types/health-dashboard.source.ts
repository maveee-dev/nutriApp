import type { LaboratoryNutritionInsightSource, LaboratoryReportAnalysisSource, LaboratoryResultAnalysisSource, LaboratoryTrendSource } from '../../laboratory/sources/laboratory-analysis.source.js';
import type { MealPlannerResponseSource } from '../../nutrition/meal-planner/types/meal-planner.type.js';
import type { NutritionInsightSource } from '../../nutrition/analysis/sources/nutrition-insight.source.js';

export interface HealthDashboardGreetingSource {
  readonly greeting: string;
  readonly displayName: string;
  readonly date: string;
  readonly profileSummary: {
    readonly conditions: readonly string[];
    readonly dialysis: string | null;
  };
}

export interface HealthDashboardNutrientProgressSource {
  readonly nutrient: string;
  readonly consumed: string;
  readonly target: string | null;
  readonly remaining: string | null;
  readonly unit: string;
  readonly targetConfigured: boolean;
  readonly percentageConsumed: number | null;
  readonly status: string;
}

export interface HealthDashboardDailyFoodSource {
  readonly id: string;
  readonly foodId: string | null;
  readonly servingId: string | null;
  readonly recipeId: string | null;
  readonly recipeVersionId: string | null;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly servingName: string;
  readonly servingGrams: string;
  readonly quantity: string;
  readonly compatibilityScore: number | null;
  readonly evaluationStatus: 'evaluated' | 'insufficient-evidence' | 'not-available';
}

export interface HealthDashboardInsightSource {
  readonly category: string;
  readonly severity: string;
  readonly title: string;
  readonly message: string;
  readonly source: 'nutrition-insight' | 'laboratory' | 'deferred-policy' | 'target-configuration';
}

export interface HealthDashboardLaboratorySummarySource {
  readonly latestReport: LaboratoryReportAnalysisSource | null;
  readonly importantResults: readonly LaboratoryResultAnalysisSource[];
  readonly trends: readonly LaboratoryTrendSource[];
  readonly insights: readonly LaboratoryNutritionInsightSource[];
}

export interface HealthDashboardMealPlannerSource {
  readonly recommendation: MealPlannerResponseSource | null;
  readonly remainingMeals: number | null;
}

export interface HealthDashboardCompatibilitySummarySource {
  readonly averageScore: number | null;
  readonly evaluated: number;
  readonly partiallyEvaluated: number;
  readonly insufficientEvidence: number;
}

export interface HealthDashboardRecipeCardSource {
  readonly recipeId: string;
  readonly recipeVersionId: string;
  readonly name: string;
  readonly isFavorite: boolean;
  readonly updatedAt: Date;
  readonly compatibilityScore: number | null;
  readonly coverage: number | null;
}

export interface HealthDashboardRecipeSummarySource {
  readonly recent: readonly HealthDashboardRecipeCardSource[];
  readonly favorites: readonly HealthDashboardRecipeCardSource[];
  readonly today: readonly HealthDashboardRecipeCardSource[];
  readonly recentEvaluated: readonly HealthDashboardRecipeCardSource[];
}

export interface HealthDashboardSource {
  readonly greeting: HealthDashboardGreetingSource;
  readonly nutritionProgress: readonly HealthDashboardNutrientProgressSource[];
  readonly nutritionInsights: readonly NutritionInsightSource[];
  readonly laboratorySummary: HealthDashboardLaboratorySummarySource;
  readonly mealPlanner: HealthDashboardMealPlannerSource;
  readonly dailyFoods: readonly HealthDashboardDailyFoodSource[];
  readonly compatibilitySummary: HealthDashboardCompatibilitySummarySource;
  readonly healthNotices: readonly HealthDashboardInsightSource[];
  readonly recipeSummary?: HealthDashboardRecipeSummarySource;
}
