import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateMealEvaluationSnapshotInput } from '../types/create-meal-evaluation-snapshot.input.js';
import { MealEvaluationSnapshotSource } from '../sources/meal-evaluation-snapshot.source.js';
import { decodeMealEvaluationSnapshot } from '../snapshots/meal-evaluation-snapshot.adapter.js';

@Injectable()
export class MealEvaluationSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMealEvaluationSnapshotInput): Promise<MealEvaluationSnapshotSource> {
    const snapshot = await this.prisma.mealItemEvaluationSnapshot.create({ data: input });
    return {
      id: snapshot.id,
      mealItemId: snapshot.mealItemId,
      score: snapshot.score,
      coverage: snapshot.coverage,
      payload: decodeMealEvaluationSnapshot({ id: snapshot.id, mealItemId: snapshot.mealItemId, score: snapshot.score, coverage: snapshot.coverage, payload: snapshot.payload as Record<string, unknown>, evaluatorVersion: snapshot.evaluatorVersion, policyVersion: snapshot.policyVersion, snapshotVersion: snapshot.snapshotVersion, evaluatedAt: snapshot.evaluatedAt }) as unknown as Record<string, unknown>,
      evaluatorVersion: snapshot.evaluatorVersion,
      policyVersion: snapshot.policyVersion,
      snapshotVersion: snapshot.snapshotVersion,
      evaluatedAt: snapshot.evaluatedAt,
    };
  }

  async findForUserDateRange(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<MealEvaluationSnapshotSource[]> {
    const snapshots = await this.prisma.mealItemEvaluationSnapshot.findMany({
      where: {
        mealItem: {
          mealLog: { userId, consumedAt: { gte: start, lt: end } },
        },
        evaluatedAt: { lt: end },
      },
      orderBy: [{ mealItemId: 'asc' }, { evaluatedAt: 'desc' }, { id: 'desc' }],
    });

    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      mealItemId: snapshot.mealItemId,
      score: snapshot.score,
      coverage: snapshot.coverage,
      payload: decodeMealEvaluationSnapshot({ id: snapshot.id, mealItemId: snapshot.mealItemId, score: snapshot.score, coverage: snapshot.coverage, payload: snapshot.payload as Record<string, unknown>, evaluatorVersion: snapshot.evaluatorVersion, policyVersion: snapshot.policyVersion, snapshotVersion: snapshot.snapshotVersion, evaluatedAt: snapshot.evaluatedAt }) as unknown as Record<string, unknown>,
      evaluatorVersion: snapshot.evaluatorVersion,
      policyVersion: snapshot.policyVersion,
      snapshotVersion: snapshot.snapshotVersion,
      evaluatedAt: snapshot.evaluatedAt,
    }));
  }

  async findByIdForUser(id: string, userId: string): Promise<MealEvaluationSnapshotSource | null> {
    const snapshot = await this.prisma.mealItemEvaluationSnapshot.findFirst({
      where: { id, mealItem: { mealLog: { userId } } },
    });
    return snapshot == null ? null : this.toSource(snapshot);
  }

  async findLatestForMealForUser(mealId: string, userId: string): Promise<MealEvaluationSnapshotSource[]> {
    const snapshots = await this.prisma.mealItemEvaluationSnapshot.findMany({
      where: { mealItem: { mealLogId: mealId, mealLog: { userId } } },
      orderBy: [{ mealItemId: 'asc' }, { evaluatedAt: 'desc' }, { id: 'desc' }],
    });
    const latest = new Map<string, typeof snapshots[number]>();
    for (const snapshot of snapshots) {
      if (!latest.has(snapshot.mealItemId)) latest.set(snapshot.mealItemId, snapshot);
    }
    return [...latest.values()].map((snapshot) => this.toSource(snapshot));
  }

  private toSource(snapshot: {
    id: string;
    mealItemId: string;
    score: number;
    coverage: number;
    payload: unknown;
    evaluatorVersion: string;
    policyVersion: string;
    snapshotVersion: string;
    evaluatedAt: Date;
  }): MealEvaluationSnapshotSource {
    return {
      id: snapshot.id,
      mealItemId: snapshot.mealItemId,
      score: snapshot.score,
      coverage: snapshot.coverage,
      payload: decodeMealEvaluationSnapshot({ id: snapshot.id, mealItemId: snapshot.mealItemId, score: snapshot.score, coverage: snapshot.coverage, payload: snapshot.payload as Record<string, unknown>, evaluatorVersion: snapshot.evaluatorVersion, policyVersion: snapshot.policyVersion, snapshotVersion: snapshot.snapshotVersion, evaluatedAt: snapshot.evaluatedAt }) as unknown as Record<string, unknown>,
      evaluatorVersion: snapshot.evaluatorVersion,
      policyVersion: snapshot.policyVersion,
      snapshotVersion: snapshot.snapshotVersion,
      evaluatedAt: snapshot.evaluatedAt,
    };
  }
}
