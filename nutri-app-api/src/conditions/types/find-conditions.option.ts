export interface FindConditionsOptions {
  search?: string;
  skip: number;
  take: number;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}
