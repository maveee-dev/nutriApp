import { CursorPaginatedResponseDto } from "../dto/cursor-paginated-response.dto.js";
import { CursorPaginatedResponseSource } from "../types/cursor-paginated-response-source.type.js";
import { cursorPaginationMetaMapper } from "./cursor-pagination-meta.mapper.js";

export function cursorPaginatedResponseMapper<TSource, TDto >(
  source: CursorPaginatedResponseSource<TSource>,
  mapper: (item: TSource) => TDto,
): CursorPaginatedResponseDto<TDto> {
  return {
    items: source.items.map(mapper),
    meta: cursorPaginationMetaMapper(source.meta),
  }
}