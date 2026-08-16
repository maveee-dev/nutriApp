import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

import { MealType } from '../../../../generated/prisma/client.js';
import { OffsetPaginationQueryDto } from '../../../common/pagination/offset/dto/offset-pagination-query.dto.js';

export class FindMealsDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @IsOptional()
  @IsIn(['consumedAt'])
  sortBy?: 'consumedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
