import { Prisma } from '../../../../generated/prisma/client.js';

export const DAILY_NUTRITION_ENTRY_INCLUDE = {
  dailyLog: { select: { date: true } },
  food: {
    include: {
      presentation: { include: { aliases: true } },
      nutrients: { include: { nutrient: true } },
    },
  },
  serving: true,
  recipeVersion: {
    include: {
      components: {
        orderBy: { displayOrder: 'asc' },
        include: {
          food: { select: { id: true, name: true } },
          serving: { select: { id: true, name: true, grams: true } },
        },
      },
    },
  },
} satisfies Prisma.DailyNutritionEntryInclude;

export const DAILY_NUTRITION_LOG_INCLUDE = {
  entries: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: DAILY_NUTRITION_ENTRY_INCLUDE,
  },
} satisfies Prisma.DailyNutritionLogInclude;

export type DailyNutritionEntryRow = Prisma.DailyNutritionEntryGetPayload<{
  include: typeof DAILY_NUTRITION_ENTRY_INCLUDE;
}>;

export type DailyNutritionLogRow = Prisma.DailyNutritionLogGetPayload<{
  include: typeof DAILY_NUTRITION_LOG_INCLUDE;
}>;

export type DailyNutritionServingRow = Prisma.ServingGetPayload<{
  include: {
    food: {
      include: {
        presentation: { include: { aliases: true } };
        nutrients: { include: { nutrient: true } };
      };
    };
  };
}>;
