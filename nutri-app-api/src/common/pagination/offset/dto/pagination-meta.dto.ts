export class PaginationMetaDto {
  readonly page!: number;
  readonly limit!: number;
  readonly totalItems!: number;
  readonly totalPages!: number;
  readonly hasNextPage!: boolean;
  readonly hasPreviousPage!: boolean;
}