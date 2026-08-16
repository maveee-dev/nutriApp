import { IsIn, IsOptional, IsString } from 'class-validator';
import { OffsetPaginationQueryDto } from '../../../common/pagination/offset/dto/offset-pagination-query.dto.js';

export class FindUsersDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'email'])
  sortBy?: 'createdAt' | 'email';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
