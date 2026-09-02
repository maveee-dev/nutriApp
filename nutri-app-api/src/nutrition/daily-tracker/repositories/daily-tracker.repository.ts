import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { Decimal } from 'decimal.js';
import type { CreateDailyNutritionEntryInput, UpdateDailyNutritionEntryInput } from '../types/daily-tracker.input.js';
import type { DailyNutritionEntrySource, DailyNutritionLogSource } from '../types/daily-tracker.source.js';
import { DAILY_NUTRITION_ENTRY_INCLUDE, DAILY_NUTRITION_LOG_INCLUDE } from './daily-tracker.prisma.js';
import { DailyTrackerRepositoryMapper } from '../mappers/daily-tracker-repository.mapper.js';

@Injectable()
export class DailyTrackerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndDate(userId: string, date: Date): Promise<DailyNutritionLogSource | null> {
    const row = await this.prisma.dailyNutritionLog.findUnique({
      where: { userId_date: { userId, date } },
      include: DAILY_NUTRITION_LOG_INCLUDE,
    });
    return row == null ? null : DailyTrackerRepositoryMapper.toLogSource(row);
  }

  async findEntryByIdForUser(id: string, userId: string): Promise<DailyNutritionEntrySource | null> {
    const row = await this.prisma.dailyNutritionEntry.findFirst({
      where: { id, dailyLog: { userId } },
      include: DAILY_NUTRITION_ENTRY_INCLUDE,
    });
    return row == null ? null : DailyTrackerRepositoryMapper.toEntrySource(row);
  }

  async findServingForFood(foodId: string, servingId: string) {
    return this.prisma.serving.findFirst({
      where: { id: servingId, foodId },
      include: {
        food: {
          include: {
            presentation: { include: { aliases: true } },
            nutrients: { include: { nutrient: true } },
          },
        },
      },
    });
  }

  async createEntry(input: CreateDailyNutritionEntryInput, snapshotFoodName: string, snapshotServingName: string): Promise<DailyNutritionEntrySource> {
    const log = await this.prisma.dailyNutritionLog.upsert({
      where: { userId_date: { userId: input.userId, date: new Date(`${input.date}T00:00:00.000Z`) } },
      create: {
        userId: input.userId,
        date: new Date(`${input.date}T00:00:00.000Z`),
      },
      update: {},
    });
    const row = await this.prisma.dailyNutritionEntry.create({
      data: {
        dailyLogId: log.id,
        foodId: input.foodId ?? null,
        servingId: input.servingId ?? null,
        recipeId: input.recipeId ?? null,
        recipeVersionId: input.recipeVersionId ?? null,
        servings: new Decimal(input.servings),
        snapshotFoodName,
        snapshotServingName,
      },
      include: DAILY_NUTRITION_ENTRY_INCLUDE,
    });
    return DailyTrackerRepositoryMapper.toEntrySource(row);
  }

  async findRecipeVersionForUser(userId: string, recipeId: string, version?: number, recipeVersionId?: string) {
    return this.prisma.recipeVersion.findFirst({
      where: {
        recipe: {
          id: recipeId,
          OR: [
            { ownerId: userId },
            { visibility: 'SHARED', versions: { some: { approvalStatus: 'APPROVED' } } },
          ],
        },
        ...(recipeVersionId == null
          ? (version == null ? { approvalStatus: 'APPROVED' } : { version, approvalStatus: 'APPROVED' })
          : { id: recipeVersionId, approvalStatus: 'APPROVED' }),
      },
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
    });
  }

  async updateEntry(id: string, userId: string, input: UpdateDailyNutritionEntryInput): Promise<DailyNutritionEntrySource | null> {
    const updated = await this.prisma.dailyNutritionEntry.updateMany({
      where: { id, dailyLog: { userId } },
      data: { servings: new Decimal(input.servings) },
    });
    if (updated.count === 0) return null;
    const row = await this.prisma.dailyNutritionEntry.findFirst({
      where: { id, dailyLog: { userId } },
      include: DAILY_NUTRITION_ENTRY_INCLUDE,
    });
    return row == null ? null : DailyTrackerRepositoryMapper.toEntrySource(row);
  }

  async deleteEntry(id: string, userId: string): Promise<boolean> {
    const deleted = await this.prisma.dailyNutritionEntry.deleteMany({
      where: { id, dailyLog: { userId } },
    });
    return deleted.count > 0;
  }
}
