import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { FoodSummarySource } from "../sources/food-summary.source.js";
import { FindFoodsOptions } from '../types/find-foods.option.js';
import { Prisma } from "../../../../generated/prisma/client.js";
import { tofoodDetailSource, toFoodSummarySource } from '../mappers/repository/food-repository.mapper.js';
import { FOOD_DETAIL_INCLUDE, FOOD_SUMMARY_INCLUDE } from './food.prisma.js';
import { FindManyResult } from "../../../common/interfaces/find-many-result.interface.js";
import { FoodDetailSource } from "../sources/food-detail.source.js";

@Injectable()
export class FoodsRepository {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async findDetailById(
    id: string,
  ): Promise<FoodDetailSource | null> {
    const food = await this.prisma.food.findUnique({
      where: {
        id
      },
      include: FOOD_DETAIL_INCLUDE,
    });

    if (!food) {
      return null;
    }

    return tofoodDetailSource(food);
  }

  async findSummaryById(
    id: string,
  ): Promise<FoodSummarySource | null> {
    const food = await this.prisma.food.findUnique({
      where: {
        id,
      },
      include: FOOD_SUMMARY_INCLUDE,
    });

    if (!food) {
      return null;
    }

    return toFoodSummarySource(food);
  }

  async findMany(
    options: FindFoodsOptions,
  ): Promise<FoodSummarySource[]> {
    const where = this.buildWhere(options);
    const orderBy = this.buildOrderBy(options);

    const foods = await this.prisma.food.findMany({
      where,
      orderBy,
      skip: options.skip,
      take: options.take,
      include: FOOD_SUMMARY_INCLUDE,
    });

    return foods.map(toFoodSummarySource);
  }

  async findManyWithCount(
    options: FindFoodsOptions,
  ): Promise<FindManyResult<FoodSummarySource>> {
    const [ items, totalItems ] = await Promise.all([
      this.findMany(options),
      this.count(options),
    ]);

    return {
      items,
      totalItems,
    };
  }

  async exists(
    id: string,
  ): Promise<boolean> {
    const count = await this.prisma.food.count({ where: { id }});

    return count > 0;
  }

  count(
    options: FindFoodsOptions
  ): Promise<number> {
    const where = this.buildWhere(options);

    return this.prisma.food.count({ where })
  }

  private buildWhere(
    options: FindFoodsOptions
  ): Prisma.FoodWhereInput {
    const where: Prisma.FoodWhereInput = {};

    if (options.search) {
      where.OR =[
        {
          name: {
            contains: options.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: options.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }

  private buildOrderBy(
    options: FindFoodsOptions,
  ): Prisma.FoodOrderByWithRelationInput {
    return {
      [ options.sortBy ?? 'name' ]: 
        options.sortOrder ?? 'asc',
    }
  }
}
