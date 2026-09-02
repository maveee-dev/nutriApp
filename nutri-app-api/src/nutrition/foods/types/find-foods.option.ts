import type { FoodSortField } from './food-sort-field.type.js';
import type { FoodSortOrder } from './food-sort-order.type.js';
import type { FoodSearchRankingContext } from './food-search-ranking-context.type.js';

export interface FindFoodsOptions {
  search?: string;
  skip: number;
  take: number;
  sortBy?: FoodSortField;
  sortOrder?: FoodSortOrder;
  /** Internal ranking context; omitted callers retain normal catalog ranking. */
  rankingContext?: FoodSearchRankingContext;
}
