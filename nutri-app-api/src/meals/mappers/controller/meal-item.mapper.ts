import { MealItemResponseDto } from '../../dto/response/meal-item-response.dto.js';
import { MealItemSource } from '../../sources/meal-item.source.js';

import { MealItemFoodMapper } from './meal-item-food.mapper.js';
import { MealItemServingMapper } from './meal-item-serving.mapper.js';

export class MealItemMapper {
  static toResponseDto(
    source: MealItemSource,
  ): MealItemResponseDto {
    return {
      id: source.id,
      food: MealItemFoodMapper.toResponseDto(source.food),
      serving: MealItemServingMapper.toResponseDto(source.serving),
      quantity: source.quantity,
    };
  }
}