import { MealType } from '../../../generated/prisma/client.js';

export interface FindMealsOptions {
  search?: string;
  userId: string;
  skip: number;
  take: number;
  sortBy?: 'consumedAt';
  sortOrder?: 'asc' | 'desc';
  mealType?: MealType;
}
