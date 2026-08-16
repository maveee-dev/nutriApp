import { Prisma } from '../../../generated/prisma/client.js';

export type UserConditionWithCondition = Prisma.UserConditionGetPayload<{
  include: { condition: true };
}>;
