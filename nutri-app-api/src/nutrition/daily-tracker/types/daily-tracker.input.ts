export interface CreateDailyNutritionEntryInput {
  readonly userId: string;
  readonly date: string;
  readonly foodId?: string;
  readonly servingId?: string;
  readonly recipeId?: string;
  readonly recipeVersionId?: string;
  readonly servings: string;
}

export interface CreateDailyRecipeEntryInput {
  readonly userId: string;
  readonly date: string;
  readonly recipeId: string;
  readonly version?: number;
  readonly recipeVersionId?: string;
  readonly servings: string;
}

export interface UpdateDailyNutritionEntryInput {
  readonly servings: string;
}
