import { MealType } from '../../../../generated/prisma/client.js';

export class MealSummaryResponseDto {
  id!: string;
  mealType!: MealType;
  consumedAt!: Date;
  itemCount!: number;
}
