import type { NutrientContribution } from '../../calculation/types/canonical-calculation.types.js';

export interface RecipeNutritionSource {
  readonly recipeId: string;
  readonly recipeVersionId: string;
  readonly recipeVersion: number;
  readonly servings: string;
  readonly servingGrams: string;
  readonly nutrients: readonly NutrientContribution[];
  readonly ingredients: readonly {
    readonly ingredientId: string;
    readonly foodId: string;
    readonly servingId: string | null;
    readonly quantity: string;
    readonly unit: string;
    readonly grams: string;
  }[];
}
