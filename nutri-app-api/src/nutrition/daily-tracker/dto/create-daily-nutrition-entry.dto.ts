import { IsNumberString, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateDailyNutritionEntryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must use YYYY-MM-DD format.' })
  date?: string;

  @IsOptional()
  @IsUUID()
  foodId!: string;

  @IsOptional()
  @IsUUID()
  servingId!: string;

  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @IsOptional()
  @IsUUID()
  recipeVersionId?: string;

  @IsNumberString()
  @Matches(/^(?!0*\.?0*$)\d+(\.\d+)?$/, { message: 'servings must be a positive number.' })
  servings!: string;
}
