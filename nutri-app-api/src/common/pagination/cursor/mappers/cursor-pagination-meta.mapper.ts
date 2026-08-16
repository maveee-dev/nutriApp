import { CursorPaginationMetaDto } from "../dto/cursor-pagination-meta.dto.js";
import { CursorPaginationMetaSource } from "../types/cursor-pagination-meta-source.js";

export function cursorPaginationMetaMapper(
  source: CursorPaginationMetaSource
): CursorPaginationMetaDto {
  return {
    nextCursor: source.nextCursor,
    hasNextPage: source.hasNextPage,
  };
}