import { PaginationMetaSource } from "../types/pagination-meta-source.type.js";
import { PaginationMetaDto } from '../dto/pagination-meta.dto.js';

export class PaginationMetaMapper {
  static toResponse(source: PaginationMetaSource): PaginationMetaDto {
    return {
      page: source.page,
      limit: source.limit,
      totalItems: source.totalItems,
      totalPages: source.totalPages,
      hasNextPage: source.hasNextPage,
      hasPreviousPage: source.hasPreviousPage,
    }
  }
}