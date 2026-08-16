import { IsIn, IsOptional, IsString } from 'class-validator';
import { OffsetPaginationQueryDto } from '../../../common/pagination/offset/dto/offset-pagination-query.dto.js';

export class FindConditionsDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'name'])
  sortBy?: 'createdAt' | 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
