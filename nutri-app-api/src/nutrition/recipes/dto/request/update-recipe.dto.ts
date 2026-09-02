import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumberString, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { CreateRecipeIngredientDto } from './create-recipe.dto.js';

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^(?!0*\.?0*$)\d+(\.\d+)?$/, { message: 'servings must be a positive number.' })
  servings?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  preparationInstructions?: string;

  @IsOptional()
  @IsIn(['PRIVATE', 'SHARED'])
  visibility?: 'PRIVATE' | 'SHARED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients?: CreateRecipeIngredientDto[];

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
