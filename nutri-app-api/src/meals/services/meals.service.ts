import { Injectable } from '@nestjs/common';
import { MealsRepository } from '../repositories/meals.repository.js';
import { MealDetailSource } from '../sources/meal-detail.source.js';
import { CreateMealInput, CreateMealItemInput } from '../types/create-meal.input.js';
import { EmptyMealError } from '../errors/empty-meal.error.js';
import { DuplicateMealItemError } from '../errors/duplicate-meal-item.error.js';
import { PaginatedResponseSource } from '../../common/pagination/offset/types/paginated-response-source.type.js';
import { MealSummarySource } from '../sources/meal-summary.source.js';
import { FindMealsOptions } from '../types/find-meals.option.js';
import { createPaginationMeta } from '../../common/utils/pagination.util.js';
import { MealNotFoundError } from '../errors/meal-not-found.error.js';
import { FindMealsInput } from '../types/find-meals.input.js';
import { MealEvaluationSnapshotService } from './meal-evaluation-snapshot.service.js';

@Injectable()
export class MealsService {
  constructor(
    private readonly mealsRepository: MealsRepository,
    private readonly snapshotService: MealEvaluationSnapshotService,
  ) {}

  async create(
    input: CreateMealInput,
  ): Promise<MealDetailSource> {
    this.validateMealItems(input.items);

    const meal = await this.mealsRepository.create(input);
    try {
      if (typeof this.snapshotService.captureForMealItems === 'function') {
        await this.snapshotService.captureForMealItems(input.userId, meal.items);
      } else {
        await Promise.all(meal.items.map((item) => this.snapshotService.captureForMealItem(input.userId, item)));
      }
      return meal;
    } catch (error) {
      // A meal without its immutable evaluation snapshots is not a valid
      // persisted domain result. Remove the newly-created aggregate so a
      // retry cannot create an un-evaluable meal.
      try {
        await this.mealsRepository.delete(meal.id, input.userId);
      } catch {
        // Preserve the original capture error; operational monitoring should
        // surface a cleanup failure separately if the compensating delete fails.
      }
      throw error;
    }
  }

  async findMany(
    input: FindMealsInput,
  ): Promise<PaginatedResponseSource<MealSummarySource>> {
    const skip = (input.page - 1) * input.limit;

    const options: FindMealsOptions = {
      search: input.search,
      userId: input.userId,
      skip,
      take: input.limit,
      mealType: input.mealType,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    };

    const { items, totalItems } = await this.mealsRepository.findManyWithCount(options);

    const meta = createPaginationMeta(
      input.page,
      input.limit,
      totalItems
    );

    return {
      items,
      meta,
    };
  }

  async findDetailById( 
    id: string,
    userId: string,
  ): Promise<MealDetailSource> {
    const meal = await this.mealsRepository.findDetailById(id, userId);

    if (!meal) {
      throw new MealNotFoundError();
    }

    return meal;
  }

  async delete(
    id: string,
    userId: string,
  ): Promise<void> {
    await this.mealsRepository.delete(id, userId);
  }

  private validateMealItems(
    items: readonly CreateMealItemInput[],
  ): void {
    if (items.length === 0) {
      throw new EmptyMealError();
    }

    const servingIds = new Set<string>();

    for (const item of items) {
      if (servingIds.has(item.servingId)) {
        throw new DuplicateMealItemError();
      }
      
      servingIds.add(item.servingId);
    }
  }
}
