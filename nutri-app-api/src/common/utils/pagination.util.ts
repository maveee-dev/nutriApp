import { PaginationMetaSource } from '../pagination/offset/types/pagination-meta-source.type.js';
export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMetaSource  {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page > totalPages,
    hasPreviousPage: page > 1,
  };
}