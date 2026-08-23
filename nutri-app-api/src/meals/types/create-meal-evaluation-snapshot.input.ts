import { Prisma } from '../../../generated/prisma/client.js';

export interface CreateMealEvaluationSnapshotInput {
  readonly mealItemId: string;
  readonly score: number;
  readonly coverage: number;
  readonly payload: Prisma.InputJsonValue;
  readonly evaluatorVersion: string;
  readonly policyVersion: string;
  readonly snapshotVersion: string;
  readonly evaluatedAt: Date;
}
