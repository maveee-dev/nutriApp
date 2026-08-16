import { CursorPaginationMetaDto } from "./cursor-pagination-meta.dto.js";

export class CursorPaginatedResponseDto<T> {
  items!: T[];
  meta!: CursorPaginationMetaDto;
}