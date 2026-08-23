import { Prisma } from '../../../../generated/prisma/client.js';

export const MEAL_TEMPLATE_DETAIL_INCLUDE = {
  versions: {
    orderBy: { version: 'desc' },
    include: {
      slots: {
        orderBy: { displayOrder: 'asc' },
        include: {
          recipeVersion: { select: { id: true, recipeId: true, name: true, version: true } },
          food: {
            select: {
              id: true,
              name: true,
              presentation: { include: { aliases: true } },
            },
          },
          serving: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.MealTemplateInclude;

export type MealTemplateWithDetails = Prisma.MealTemplateGetPayload<{
  include: typeof MEAL_TEMPLATE_DETAIL_INCLUDE;
}>;
