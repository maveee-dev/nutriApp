import { IsNumberString, IsUUID, Matches } from 'class-validator';
import type { DecimalValue } from '../../../common/types/decimal-value.type.js';

export class CreateMealItemDto {
  @IsUUID()
  servingId!: string;

  @IsNumberString()
  @Matches(/^(?!0*\.?0*$)\d+(\.\d+)?$/, {
    message: 'quantity must be a positive number',
  })
  quantity!: DecimalValue;
}