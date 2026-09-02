import { Type } from 'class-transformer';
import { IsInt, IsNumberString, IsOptional, Matches, Min } from 'class-validator';

export class RecipeEvaluationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsNumberString()
  @Matches(/^(?:0\.[0-9]+|[1-9][0-9]*(?:\.[0-9]+)?)$/)
  servings?: string;
}
