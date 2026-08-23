import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class MealPlanSubstitutionDto {
  @IsString()
  @IsNotEmpty()
  slotId!: string;

  @IsString()
  @IsNotEmpty()
  recipeVersionId!: string;
}

export class CustomizeMealPlanDto {
  @IsString()
  @IsNotEmpty()
  templateVersionId!: string;

  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])
  mealType!: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MealPlanSubstitutionDto)
  substitutions!: MealPlanSubstitutionDto[];
}
