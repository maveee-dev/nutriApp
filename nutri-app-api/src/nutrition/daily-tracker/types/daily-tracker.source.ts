import type { NutritionAnalysisNutrientSource } from '../../analysis/sources/nutrition-analysis.source.js';
import type { RecipeVersionSource } from '../../recipes/types/recipe.source.js';

export interface DailyNutritionEntrySource {
  readonly id: string;
  readonly date: string;
  readonly foodId: string | null;
  readonly servingId: string | null;
  readonly recipeId: string | null;
  readonly recipeVersionId: string | null;
  readonly servings: string;
  readonly snapshotFoodName: string;
  readonly snapshotServingName: string;
  readonly foodName: string;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly servingName: string;
  readonly servingGrams: string;
  readonly nutrients: readonly NutritionAnalysisNutrientSource[];
  readonly recipeVersion?: RecipeVersionSource;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DailyNutritionTotalSource {
  readonly amount: string;
  readonly unit: string;
}

export type DailyNutritionTotalsSource = Readonly<Record<string, DailyNutritionTotalSource>>;

export interface DailyNutritionTargetSource {
  readonly current: string | null;
  readonly target: string | null;
  readonly remaining: string | null;
  readonly percentageConsumed: number | null;
  readonly unit: string;
  readonly kind: 'UPPER_LIMIT' | 'LOWER_TARGET' | 'RANGE';
  readonly status: 'within-target' | 'target-met' | 'over-limit' | 'below-target' | 'within-range' | 'not-configured';
  readonly rangeMin: string | null;
  readonly rangeMax: string | null;
  readonly source: string;
  readonly approvalStatus: string;
}

export type DailyNutritionTargetsSource = Readonly<Record<string, DailyNutritionTargetSource>>;

export interface DailyNutritionLogSource {
  readonly date: string;
  readonly entries: readonly DailyNutritionEntrySource[];
  readonly totals: DailyNutritionTotalsSource;
  readonly targets: DailyNutritionTargetsSource;
}
