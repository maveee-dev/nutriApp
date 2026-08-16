import { Prisma } from '../../../generated/prisma/client.js';

export const MEAL_SUMMARY_INCLUDE = {
  items: true,
} satisfies Prisma.MealLogInclude;

export const MEAL_DETAIL_INCLUDE = {
  items: {
    include: {
      serving: {
        include: {
          food: true,
        },
      },
    },
  },
} satisfies Prisma.MealLogInclude;

export type MealSummary = Prisma.MealLogGetPayload<{
  include: typeof MEAL_SUMMARY_INCLUDE;
}>;
export type MealDetail = Prisma.MealLogGetPayload<{
  include: typeof MEAL_DETAIL_INCLUDE;
}>;
export type MealItem = MealDetail['items'][number];
export type MealItemFood = MealItem['serving']['food'];
export type MealItemServing = MealItem['serving'];
