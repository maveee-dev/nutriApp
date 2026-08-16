import { FoodCategoryResponseDto } from '../../dto/response/food-category-response.dto.js';
import { FoodCategorySource } from '../../sources/food-category.source.js';

export class FoodCategoryResponseMapper {
  static toFoodCategoryDto(
    source: FoodCategorySource,
  ): FoodCategoryResponseDto {
    return {
      id: source.id,
      name: source.name,
      description: source.description,
    };
  }
}
