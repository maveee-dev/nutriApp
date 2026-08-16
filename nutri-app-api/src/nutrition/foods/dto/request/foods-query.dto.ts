import { IsIn, IsOptional, IsString } from "class-validator";
import { OffsetPaginationQueryDto } from "../../../../common/pagination/offset/dto/offset-pagination-query.dto.js";
import type { FoodSortField } from "../../types/food-sort-field.type.js";
import type { FoodSortOrder } from "../../types/food-sort-order.type.js";

export class FoodsQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'name'])
  sortBy?: FoodSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: FoodSortOrder = 'asc';
}