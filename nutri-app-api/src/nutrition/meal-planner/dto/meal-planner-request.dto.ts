import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MEAL_PLANNER_FOCUSES, MEAL_PLANNER_MEAL_TYPES } from '../types/meal-planner.type.js';

export class MealPlannerRequestDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(MEAL_PLANNER_MEAL_TYPES)
  mealType?: (typeof MEAL_PLANNER_MEAL_TYPES)[number];

  @IsOptional()
  @IsIn(MEAL_PLANNER_FOCUSES)
  focus?: (typeof MEAL_PLANNER_FOCUSES)[number];

  @IsOptional()
  @Matches(/^(?!0*\.?0*$)\d+(\.\d+)?$/, { message: 'caloriesRemaining must be a positive number.' })
  caloriesRemaining?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeExplanation?: boolean;
}
