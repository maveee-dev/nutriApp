import type { DecimalValue } from '../../../common/types/decimal-value.type.js';

export class MealItemServingResponseDto {
  id!: string;
  name!: string;
  grams!: DecimalValue;
}