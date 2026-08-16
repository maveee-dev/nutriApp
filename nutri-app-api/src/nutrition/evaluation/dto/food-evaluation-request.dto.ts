import { IsNumberString, IsUUID } from 'class-validator';

export class FoodEvaluationRequestDto {
  @IsUUID()
  foodId!: string;

  @IsUUID()
  servingId!: string;

  @IsNumberString()
  quantity!: string;
}
