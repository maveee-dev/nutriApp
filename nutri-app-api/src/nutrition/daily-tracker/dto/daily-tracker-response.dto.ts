export class DailyNutritionTotalDto {
  amount!: string;
  unit!: string;
}

export class DailyNutritionEntryDto {
  id!: string;
  foodId!: string | null;
  servingId!: string | null;
  recipeId?: string;
  recipeVersionId?: string;
  servings!: string;
  foodName!: string;
  displayName!: string;
  variantLabel!: string | null;
  servingName!: string;
  servingGrams!: string;
  snapshotFoodName!: string;
  snapshotServingName!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class DailyNutritionTargetDto {
  current!: string | null;
  target!: string | null;
  remaining!: string | null;
  percentageConsumed!: number | null;
  unit!: string;
  kind!: 'UPPER_LIMIT' | 'LOWER_TARGET' | 'RANGE';
  status!: string;
  rangeMin!: string | null;
  rangeMax!: string | null;
  source!: string;
  approvalStatus!: string;
}

export class DailyNutritionResponseDto {
  date!: string;
  entries!: DailyNutritionEntryDto[];
  totals!: Record<string, DailyNutritionTotalDto>;
  targets!: Record<string, DailyNutritionTargetDto>;
}
