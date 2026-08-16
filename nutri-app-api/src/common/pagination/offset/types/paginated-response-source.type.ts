import { PaginationMetaSource } from './pagination-meta-source.type.js';

export type PaginatedResponseSource<T> = {
  items: T[];
  meta: PaginationMetaSource;
}