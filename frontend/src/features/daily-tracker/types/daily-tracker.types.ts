export interface DailyNutritionTotal {
  amount: string;
  unit: string;
}

export interface DailyNutritionEntry {
  id: string;
  foodId: string | null;
  servingId: string | null;
  recipeId?: string;
  recipeVersionId?: string;
  servings: string;
  foodName: string;
  displayName: string;
  variantLabel: string | null;
  servingName: string;
  servingGrams: string;
  snapshotFoodName: string;
  snapshotServingName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyNutritionTarget {
  current: string | null;
  target: string | null;
  remaining: string | null;
  percentageConsumed: number | null;
  unit: string;
  kind: 'UPPER_LIMIT' | 'LOWER_TARGET' | 'RANGE';
  status: string;
  rangeMin: string | null;
  rangeMax: string | null;
  source: string;
  approvalStatus: string;
}

export interface DailyNutritionResponse {
  date: string;
  entries: DailyNutritionEntry[];
  totals: Record<string, DailyNutritionTotal>;
  targets: Record<string, DailyNutritionTarget>;
}

export interface CreateDailyNutritionEntryRequest {
  date?: string;
  foodId?: string;
  servingId?: string;
  recipeId?: string;
  recipeVersionId?: string;
  servings: string;
}

export interface UpdateDailyNutritionEntryRequest {
  servings: string;
}
