import { MealItemFoodSource } from '../../sources/meal-item-food.source.js';
import { MealItemFoodResponseDto } from '../../dto/response/meal-item-food-response.dto.js';

export class MealItemFoodMapper {
  static toResponseDto(
    source: MealItemFoodSource,
  ): MealItemFoodResponseDto {
    return {
      id: source.id,
      name: source.name,
      displayName: source.displayName ?? source.name,
      variantLabel: source.variantLabel ?? null,
    };
  }
}
