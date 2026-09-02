import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { RecipeComponentRole, RecipeQuantityUnit } from '../../../../../generated/prisma/client.js';

export class CreateRecipeIngredientDto {
  @IsUUID()
  foodId!: string;

  @IsOptional()
  @IsUUID()
  servingId?: string;

  @IsNumberString()
  @Matches(/^(?!0*\.?0*$)\d+(\.\d+)?$/, { message: 'quantity must be a positive number.' })
  quantity!: string;

  @IsOptional()
  @IsEnum(RecipeQuantityUnit)
  unit?: RecipeQuantityUnit;

  @IsOptional()
  @IsEnum(RecipeComponentRole)
  role?: RecipeComponentRole;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateRecipeDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumberString()
  @Matches(/^(?!0*\.?0*$)\d+(\.\d+)?$/, { message: 'servings must be a positive number.' })
  servings!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  preparationInstructions?: string;

  @IsOptional()
  @IsIn(['PRIVATE', 'SHARED'])
  visibility?: 'PRIVATE' | 'SHARED';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients!: CreateRecipeIngredientDto[];
}
