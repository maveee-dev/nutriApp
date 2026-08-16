import { PaginatedResponseSource } from '../types/paginated-response-source.type.js';
import { OffsetPaginatedResponseDto } from '../dto/offset-paginated-response.dto.js';
import { PaginationMetaMapper } from './pagination-meta.mapper.js';

export class OffsetPaginatedResponseMapper {
  static toResponse<TSource, TDto>(
    source: PaginatedResponseSource<TSource>,
    mapper: (item: TSource) => TDto,
  ): OffsetPaginatedResponseDto<TDto> {
    return {
      items: source.items.map(mapper),
      meta: PaginationMetaMapper.toResponse(source.meta),
    };
  }
}