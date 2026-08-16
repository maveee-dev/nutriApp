export interface FindConditionsInput {
  search?: string;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}
