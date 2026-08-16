import { Prisma } from '../../../../generated/prisma/client.js';

export const FOOD_SUMMARY_INCLUDE = {
  category: true,
} satisfies Prisma.FoodInclude;

export const FOOD_DETAIL_INCLUDE = {
  category: true,
  servings: true,
  nutrients: {
    include: {
      nutrient: true,
    },
  },
} satisfies Prisma.FoodInclude;

export type FoodWithRelations = Prisma.FoodGetPayload<{
  include: typeof FOOD_DETAIL_INCLUDE;
}>;
export type FoodWithCategory = Prisma.FoodGetPayload<{
  include: typeof FOOD_SUMMARY_INCLUDE;
}>;
