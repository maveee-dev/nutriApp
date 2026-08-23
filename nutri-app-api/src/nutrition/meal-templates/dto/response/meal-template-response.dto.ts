export class MealTemplateSlotResponseDto {
  id!: string;
  role!: string;
  kind!: string;
  name!: string;
  required!: boolean;
  allowCanonicalFoodFallback!: boolean;
  displayOrder!: number;
  recipeId!: string | null;
  recipeVersionId!: string | null;
  recipeName!: string | null;
  recipeVersion!: number | null;
  foodId!: string | null;
  foodName!: string | null;
  servingId!: string | null;
  servingName!: string | null;
  quantity!: string | null;
  unit!: string | null;
  notes!: string | null;
}

export class MealTemplateVersionResponseDto {
  id!: string;
  version!: number;
  name!: string;
  description!: string | null;
  cuisine!: string | null;
  mealTypes!: readonly string[];
  sourceType!: string;
  sourceName!: string | null;
  sourceUrl!: string | null;
  sourceReference!: string | null;
  sourceVersion!: string | null;
  approvalStatus!: string;
  approvedAt!: Date | null;
  approvedByUserId!: string | null;
  createdAt!: Date;
  slots!: readonly MealTemplateSlotResponseDto[];
}

export class MealTemplateResponseDto {
  id!: string;
  ownerId!: string | null;
  visibility!: string;
  createdAt!: Date;
  updatedAt!: Date;
  versions!: readonly MealTemplateVersionResponseDto[];
}
