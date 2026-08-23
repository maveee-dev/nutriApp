import { ActivityLevel, NutritionGoal, Sex } from '../../../../generated/prisma/client.js';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;

  @IsOptional()
  @IsEnum(NutritionGoal)
  nutritionGoal?: NutritionGoal;
}
