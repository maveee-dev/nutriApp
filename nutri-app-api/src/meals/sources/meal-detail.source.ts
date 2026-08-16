import { MealType } from '../../../generated/prisma/client.js';
import { MealItemSource } from './meal-item.source.js';

export interface MealDetailSource {
  id: string;
  mealType: MealType;
  consumedAt: Date;
  items: MealItemSource[];
}
