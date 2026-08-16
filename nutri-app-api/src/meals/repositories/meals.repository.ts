import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MealDetailSource } from "../sources/meal-detail.source.js";
import { MEAL_DETAIL_INCLUDE, MEAL_SUMMARY_INCLUDE } from './meal.prisma.js';
import { MealRepositoryMapper } from "../mappers/repository/meal-repository.mapper.js";
import { MealSummarySource } from "../sources/meal-summary.source.js";
import { FindMealsOptions } from "../types/find-meals.option.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { FindManyResult } from "../../common/interfaces/find-many-result.interface.js";
import { MealNotFoundError } from "../errors/meal-not-found.error.js";
import { throwIfPrismaForeignKeyConstraint } from "../../common/prisma/prisma-error.util.js";
import { CreateMealInput } from '../types/create-meal.input.js';
import { ServingNotFoundError } from "../errors/serving-not-found.error.js";

@Injectable()
export class MealsRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findDetailById(
    id: string,
    userId: string,
  ): Promise<MealDetailSource | null> {
    const meal = await this.prisma.mealLog.findFirst({
      where: { id, userId },
      include: MEAL_DETAIL_INCLUDE,
    });

    if (!meal) {
      return null;
    }

    return MealRepositoryMapper.toMealDetailSource(meal)
  }

  async findSummaryById(
    id: string,
  ): Promise<MealSummarySource | null> {
    const meal = await this.prisma.mealLog.findUnique({
      where: {
        id,
      },
      include: MEAL_SUMMARY_INCLUDE,
    });

    if (!meal) {
      return null;
    }

    return MealRepositoryMapper.toMealSummarySource(meal);
  }

  async findMany(
    options: FindMealsOptions,
  ): Promise<MealSummarySource[]> {
    const where = this.buildWhere(options);
    const orderBy = this.buildOrderBy(options);
    
    const meals = await this.prisma.mealLog.findMany({
      where,
      orderBy,
      skip: options.skip,
      take: options.take,
      include: MEAL_SUMMARY_INCLUDE,
    });

    return meals.map(MealRepositoryMapper.toMealSummarySource);
  }

  async findManyWithCount(options: FindMealsOptions): Promise<FindManyResult<MealSummarySource>> {
    const where = this.buildWhere(options);
    const orderBy = this.buildOrderBy(options);

    const [meals, totalItems] = await Promise.all([
      this.prisma.mealLog.findMany({
        where,
        orderBy,
        skip: options.skip,
        take: options.take,
        include: MEAL_SUMMARY_INCLUDE,
      }),
      this.prisma.mealLog.count({ where }),
    ]);

    return {
      items: meals.map(MealRepositoryMapper.toMealSummarySource),
      totalItems,
    };
  }

  async create(
    input: CreateMealInput,
  ): Promise<MealDetailSource> {
    try {
      const meal = await this.prisma.mealLog.create({
        data: {
          userId: input.userId,
          mealType: input.mealType,
          consumedAt: input.consumedAt,

          items: {
            create: input.items.map((item) => ({
              servingId: item.servingId,
              quantity: item.quantity,
            })),
          },
        },

        include: MEAL_DETAIL_INCLUDE,
      });

      return MealRepositoryMapper.toMealDetailSource(meal)
    } catch (error) {
      throwIfPrismaForeignKeyConstraint(error, () => new ServingNotFoundError());
    }
  }

  async count(
    options: FindMealsOptions,
  ): Promise<number> {
    const where = this.buildWhere(options);

    return this.prisma.mealLog.count({ where });
  }

  async exists(
    id: string,
  ): Promise<boolean> {
    const count = await this.prisma.mealLog.count({
      where: { id },
    });

    return count > 0;
  }

  async delete(
    id: string,
    userId: string,
  ): Promise<void> {
    const result = await this.prisma.mealLog.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new MealNotFoundError();
    }
  }

  private buildWhere(
    options: FindMealsOptions,
  ): Prisma.MealLogWhereInput {
    const search = options.search?.trim();
    const where: Prisma.MealLogWhereInput = {
      userId: options.userId,
    };

    if (options.mealType) {
      where.mealType = options.mealType;
    }

    if (search) {
      where.items = {
        some: {
          serving: {
            food: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      };
    }

    return where;
  }

  private buildOrderBy(
    options: FindMealsOptions,
  ): Prisma.MealLogOrderByWithRelationInput {
    return {
      [options.sortBy ?? 'consumedAt']:
        options.sortOrder ?? 'asc',
    };
  }
}
