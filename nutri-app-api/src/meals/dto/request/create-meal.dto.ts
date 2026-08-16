import { ArrayMinSize, IsArray, IsDateString, IsEnum, ValidateNested } from "class-validator";
import { MealType } from '../../../../generated/prisma/client.js';
import { CreateMealItemDto } from "./create-meal-item.dto.js";
import { Type } from "class-transformer";

export class CreateMealDto {
  @IsEnum(MealType)
  mealType!: MealType;

  @IsDateString()
  consumedAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested(({ each: true }))
  @Type(() => CreateMealItemDto)
  items!: CreateMealItemDto[];
}
