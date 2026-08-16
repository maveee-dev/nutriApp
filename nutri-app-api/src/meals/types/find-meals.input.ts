import { MealType } from '../../../generated/prisma/client.js';

export interface FindMealsInput {
  readonly userId: string;
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly mealType?: MealType;
  readonly sortBy?: 'consumedAt';
  readonly sortOrder?: 'asc' | 'desc';
}
