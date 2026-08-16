import { Prisma } from '../../../../generated/prisma/client.js';

export const MEAL_ANALYSIS_INCLUDE = {
  items: {
    include: {
      serving: {
        include: {
          food: {
            include: {
              nutrients: { include: { nutrient: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MealLogInclude;

export type MealAnalysisRow = Prisma.MealLogGetPayload<{
  include: typeof MEAL_ANALYSIS_INCLUDE;
}>;
