export class RecipeNutritionNutrientDto {
  name!: string;
  unit!: string;
  amount!: string;
}

export class RecipeNutritionResponseDto {
  recipeId!: string;
  recipeVersionId!: string;
  recipeVersion!: number;
  servings!: string;
  servingGrams!: string;
  nutrients!: readonly RecipeNutritionNutrientDto[];
  ingredients!: readonly {
    ingredientId: string;
    foodId: string;
    servingId: string | null;
    quantity: string;
    unit: string;
    grams: string;
  }[];
}
