import type { DecimalValue } from '../../../common/types/decimal-value.type.js';

import { MealItemFoodResponseDto } from './meal-item-food-response.dto.js';
import { MealItemServingResponseDto } from './meal-item-serving-response.dto.js';

export class MealItemResponseDto {
  id!: string;
  food!: MealItemFoodResponseDto;
  serving!: MealItemServingResponseDto;
  quantity!: DecimalValue;
}