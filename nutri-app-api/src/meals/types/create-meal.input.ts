import { MealType } from '../../../generated/prisma/client.js';
import { DecimalValue } from '../../common/types/decimal-value.type.js';

export interface CreateMealItemInput {
  readonly servingId: string;
  readonly quantity: DecimalValue;
}

export interface CreateMealInput {
  readonly userId: string;
  readonly mealType: MealType;
  readonly consumedAt: Date;
  readonly items: readonly CreateMealItemInput[];
}
