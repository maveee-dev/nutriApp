export interface FindUsersOptions {
  search?: string;
  skip: number;
  take: number;
  sortBy?: 'createdAt' | 'email';
  sortOrder?: 'asc' | 'desc';
}
