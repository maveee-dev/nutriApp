import { MealType } from '../../../../generated/prisma/client.js';

import { MealItemResponseDto } from './meal-item-response.dto.js';

export class MealDetailResponseDto {
  id!: string;
  mealType!: MealType;
  consumedAt!: Date;
  items!: MealItemResponseDto[];
}
