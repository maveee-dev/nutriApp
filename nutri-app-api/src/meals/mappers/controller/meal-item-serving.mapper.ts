import { MealItemServingResponseDto } from '../../dto/response/meal-item-serving-response.dto.js';
import { MealItemServingSource } from '../../sources/meal-item-serving.source.js';

export class MealItemServingMapper {
  static toResponseDto(
    source: MealItemServingSource,
  ): MealItemServingResponseDto {
    return {
      id: source.id,
      name: source.name,
      grams: source.grams,
    };
  }
}