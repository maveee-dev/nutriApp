export class RecipeComponentResponseDto {
  id!: string;
  foodId!: string;
  foodName!: string;
  foodDisplayName!: string;
  foodVariantLabel!: string | null;
  servingId!: string | null;
  servingName!: string | null;
  servingGrams!: string | null;
  role!: string;
  quantity!: string;
  unit!: string;
  displayOrder!: number;
  notes!: string | null;
}

export class RecipeVersionResponseDto {
  id!: string;
  version!: number;
  name!: string;
  description!: string | null;
  cuisine!: string | null;
  mealTypes!: readonly string[];
  yieldServings!: string;
  sourceType!: string;
  sourceName!: string | null;
  sourceUrl!: string | null;
  sourceReference!: string | null;
  sourceVersion!: string | null;
  approvalStatus!: string;
  approvedAt!: Date | null;
  approvedByUserId!: string | null;
  createdAt!: Date;
  components!: readonly RecipeComponentResponseDto[];
}

export class RecipeResponseDto {
  id!: string;
  ownerId!: string | null;
  visibility!: string;
  createdAt!: Date;
  updatedAt!: Date;
  versions!: readonly RecipeVersionResponseDto[];
}
