import type { FoodSortField } from './food-sort-field.type.js';
import type { FoodSortOrder } from './food-sort-order.type.js';

export interface FindFoodsOptions {
  search?: string;
  skip: number;
  take: number;
  sortBy?: FoodSortField;
  sortOrder?: FoodSortOrder;
}
