import { Injectable } from '@nestjs/common';
import { FoodsRepository } from '../repositories/foods.repository.js';
import type { PaginatedResponseSource } from '../../../common/pagination/offset/types/paginated-response-source.type.js';
import { createPaginationMeta } from '../../../common/utils/pagination.util.js';
import type { FoodSummarySource } from '../sources/food-summary.source.js';
import type { FoodDetailSource } from '../sources/food-detail.source.js';
import { FoodNotFoundError } from '../errors/food-not-found.error.js';
import { FindFoodsInput } from '../types/find-foods.input.js';
import { FindFoodsOptions } from '../types/find-foods.option.js';
import type { FoodSearchRankingContext } from '../types/food-search-ranking-context.type.js';

@Injectable()
export class FoodsService {
  constructor(
    private readonly foodsRepository: FoodsRepository
  ) {}

  async findMany(
    input: FindFoodsInput,
    rankingContext: FoodSearchRankingContext = 'catalog',
  ): Promise<PaginatedResponseSource<FoodSummarySource>> {
    const skip = (input.page - 1) * input.limit;

    const options: FindFoodsOptions = {
      search: input.search,
      skip,
      take: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      rankingContext,
    };

    const { items, totalItems } = 
      await this.foodsRepository.findManyWithCount(options);

    const meta = createPaginationMeta(
      input.page,
      input.limit,
      totalItems,
    );

    return {
      items,
      meta,
    };
  }

  /**
   * Returns the complete summary catalog for internal deterministic selectors
   * such as the meal planner. Public food browsing remains paginated; this
   * method keeps catalog discovery behind the existing service boundary.
   */
  findAllForPlanning(): Promise<readonly FoodSummarySource[]> {
    return this.foodsRepository.findSearchCandidates({
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }

  async findDetailById(
    id: string,
  ): Promise<FoodDetailSource> {
    const food = await this.foodsRepository.findDetailById(id);

    if (!food) {
      throw new FoodNotFoundError();
    }

    return food;
  }
}
