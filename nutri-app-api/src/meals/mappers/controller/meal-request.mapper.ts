import { CreateMealDto } from "../../dto/request/create-meal.dto.js";
import { FindMealsDto } from "../../dto/request/find-meals.dto.js";
import { CreateMealInput } from '../../types/create-meal.input.js';
import { FindMealsInput } from '../../types/find-meals.input.js';

export class MealRequestMapper {
  static toCreateMealInput(
    userId: string,
    dto: CreateMealDto,
  ): CreateMealInput {
    return {
      userId,
      mealType: dto.mealType,
      consumedAt: new Date(dto.consumedAt),
      items: dto.items,
    };
  }

  static toFindMealsInput(
    userId: string,
    dto: FindMealsDto,
  ): FindMealsInput {
    return {
      userId,
      search: dto.search,
      page: dto.page,
      limit: dto.limit,
      mealType: dto.mealType,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    };
  }
}
