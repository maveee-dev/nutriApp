import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { FoodSummarySource } from "../sources/food-summary.source.js";
import { FindFoodsOptions } from '../types/find-foods.option.js';
import { Prisma } from "../../../../generated/prisma/client.js";
import { tofoodDetailSource, toFoodSummarySource } from '../mappers/repository/food-repository.mapper.js';
import { FOOD_DETAIL_INCLUDE, FOOD_SUMMARY_INCLUDE } from './food.prisma.js';
import { FindManyResult } from "../../../common/interfaces/find-many-result.interface.js";
import { FoodDetailSource } from "../sources/food-detail.source.js";
import { rankFoodSearchResults } from '../services/food-search-ranker.js';

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

  async findSearchCandidates(
    options: Omit<FindFoodsOptions, 'skip' | 'take'>,
  ): Promise<FoodSummarySource[]> {
    const foods = await this.prisma.food.findMany({
      where: this.buildWhere(options),
      include: FOOD_SUMMARY_INCLUDE,
    });

    return foods.map(toFoodSummarySource);
  }

  async findManyWithCount(
    options: FindFoodsOptions,
  ): Promise<FindManyResult<FoodSummarySource>> {
    if (options.search?.trim()) {
      const candidates = await this.findSearchCandidates(options);
      const ranked = rankFoodSearchResults(candidates, options.search);
      return {
        items: ranked.slice(options.skip, options.skip + options.take),
        totalItems: ranked.length,
      };
    }

    const [ items, totalItems ] = await Promise.all([this.findMany(options), this.count(options)]);

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
    options: Pick<FindFoodsOptions, 'search'>
  ): Prisma.FoodWhereInput {
    const where: Prisma.FoodWhereInput = {};

    if (options.search?.trim()) {
      const search = options.search.trim();
      const searchFields = (term: string): Prisma.FoodWhereInput[] => [
        {
          name: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          presentation: {
            is: {
              displayNameOverride: {
                contains: term,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          presentation: {
            is: {
              variantLabelOverride: {
                contains: term,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          presentation: {
            is: {
              aliases: {
                some: {
                  alias: {
                    contains: term,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        },
      ];
      const terms = search.split(/\s+/).filter(Boolean);

      // Derived names are deliberately not persisted. Requiring each query
      // token to occur in canonical/source metadata makes multi-word searches
      // such as "chicken breast" discover derived display names without
      // moving parsing into the database or duplicating presentation data.
      where.AND = terms.map((term) => ({ OR: searchFields(term) }));
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
