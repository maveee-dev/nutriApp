import { Prisma } from '../../../../generated/prisma/client.js';

export const RECIPE_DETAIL_INCLUDE = {
  versions: {
    orderBy: { version: 'desc' },
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
} satisfies Prisma.RecipeInclude;

export type RecipeWithDetails = Prisma.RecipeGetPayload<{
  include: typeof RECIPE_DETAIL_INCLUDE;
}>;
