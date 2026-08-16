import type { FoodSortField } from './food-sort-field.type.js';
import type { FoodSortOrder } from './food-sort-order.type.js';

export interface FindFoodsInput {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly sortBy?: FoodSortField;
  readonly sortOrder?: FoodSortOrder;
}
