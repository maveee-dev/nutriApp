export interface FoodCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface Serving {
  id: string;
  name: string;
  grams: string;
}

export interface Nutrient {
  id: string;
  name: string;
  unit: string;
  description: string | null;
}

export interface FoodNutrient {
  nutrient: Nutrient;
  amount: string;
}

export interface FoodSummary {
  id: string;
  name: string;
  displayName?: string;
  description?: string | null;
  variantLabel?: string | null;
  category: FoodCategory;
}

export interface FoodDetail {
  id: string;
  name: string;
  displayName?: string;
  variantLabel?: string | null;
  category: FoodCategory;
  servings: Serving[];
  nutrients: FoodNutrient[];
  createdAt: string;
  updatedAt: string;
}

export interface FoodsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}
