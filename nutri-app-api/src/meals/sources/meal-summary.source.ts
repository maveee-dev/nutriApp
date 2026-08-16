import { MealType } from '../../../generated/prisma/client.js';

export interface MealSummarySource {
  id: string;
  mealType: MealType;
  consumedAt: Date;
  itemCount: number;
}
