import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class RecipeEvaluationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}
