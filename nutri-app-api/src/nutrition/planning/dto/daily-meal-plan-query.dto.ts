import { IsDateString, IsOptional } from 'class-validator';

export class DailyMealPlanQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
