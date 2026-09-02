import { Injectable } from '@nestjs/common';
import { FoodsService } from '../../foods/services/foods.service.js';
import type { FoodDetailSource } from '../../foods/sources/food-detail.source.js';
import type { FoodSummarySource } from '../../foods/sources/food-summary.source.js';

@Injectable()
export class MealPlannerRepository {
  constructor(private readonly foodsService: FoodsService) {}

  async findCandidateFoods(): Promise<readonly FoodSummarySource[]> {
    const catalog = [...await this.foodsService.findAllForPlanning()];
    return catalog.sort((left, right) => {
      const display = (left.displayName ?? left.name).localeCompare(right.displayName ?? right.name);
      if (display !== 0) return display;
      const canonical = left.name.localeCompare(right.name);
      return canonical !== 0 ? canonical : left.id.localeCompare(right.id);
    });
  }

  findFoodById(id: string): Promise<FoodDetailSource> {
    return this.foodsService.findDetailById(id);
  }
}
