import { PaginationMetaDto } from './pagination-meta.dto.js';

export class OffsetPaginatedResponseDto<T> {
  readonly items!: T[];
  readonly meta!: PaginationMetaDto;
}