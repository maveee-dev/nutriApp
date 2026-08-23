export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface CreateMealItemRequest {
  servingId: string;
  quantity: string;
}

export interface CreateMealRequest {
  mealType: MealType;
  consumedAt: string;
  items: CreateMealItemRequest[];
}

export interface MealSummary {
  id: string;
  mealType: MealType;
  consumedAt: string;
  itemCount: number;
}

export interface MealItemFood {
  id: string;
  name: string;
  displayName?: string;
  variantLabel?: string | null;
}

export interface MealItemServing {
  id: string;
  name: string;
  grams: string;
}

export interface MealItemDetail {
  id: string;
  food: MealItemFood;
  serving: MealItemServing;
  quantity: string;
}

export interface MealDetail {
  id: string;
  mealType: MealType;
  consumedAt: string;
  items: MealItemDetail[];
}

export interface FindMealsQuery {
  page?: number;
  limit?: number;
  search?: string;
  mealType?: MealType;
  sortBy?: 'consumedAt';
  sortOrder?: 'asc' | 'desc';
}
