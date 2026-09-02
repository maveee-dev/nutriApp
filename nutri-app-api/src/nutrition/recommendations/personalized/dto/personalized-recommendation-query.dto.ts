import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MEAL_PLANNER_MEAL_TYPES } from '../../../meal-planner/types/meal-planner.type.js';
import { PERSONALIZED_RECOMMENDATION_GOALS } from '../types/personalized-recommendation.type.js';

function normalizeEnum(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]+/g, '_') : value;
}

export class PersonalizedRecommendationQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeEnum(value))
  @IsIn(PERSONALIZED_RECOMMENDATION_GOALS)
  goal?: (typeof PERSONALIZED_RECOMMENDATION_GOALS)[number];

  @IsOptional()
  @Transform(({ value }) => normalizeEnum(value))
  @IsIn(MEAL_PLANNER_MEAL_TYPES)
  mealType?: (typeof MEAL_PLANNER_MEAL_TYPES)[number];

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
