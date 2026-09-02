import type { RecipeNutritionSource } from '../../types/recipe-nutrition.source.js';
import { RecipeNutritionResponseDto } from '../../dto/response/recipe-nutrition-response.dto.js';

export class RecipeNutritionResponseMapper {
  static toDto(source: RecipeNutritionSource): RecipeNutritionResponseDto {
    return {
      recipeId: source.recipeId,
      recipeVersionId: source.recipeVersionId,
      recipeVersion: source.recipeVersion,
      servings: source.servings,
      servingGrams: source.servingGrams,
      nutrients: source.nutrients.map(({ name, unit, amount }) => ({ name, unit, amount })),
      ingredients: source.ingredients.map((ingredient) => ({ ...ingredient })),
    };
  }
}
