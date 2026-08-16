export interface FindUsersInput {
  search?: string;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'email';
  sortOrder?: 'asc' | 'desc';
}
