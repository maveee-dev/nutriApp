import { CursorPaginationMetaSource } from "./cursor-pagination-meta-source.js";

export type CursorPaginatedResponseSource<T> = {
  items: T[];
  meta: CursorPaginationMetaSource;
}