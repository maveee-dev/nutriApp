import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { MEAL_TEMPLATE_DETAIL_INCLUDE } from './meal-template.prisma.js';
import { toMealTemplateSource } from '../mappers/repository/meal-template-repository.mapper.js';
import type { MealTemplateSource } from '../types/meal-template.source.js';

@Injectable()
export class MealTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyVisibleToUser(userId: string): Promise<MealTemplateSource[]> {
    const rows = await this.prisma.mealTemplate.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { visibility: 'SHARED', versions: { some: { approvalStatus: 'APPROVED' } } },
        ],
      },
      include: MEAL_TEMPLATE_DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toMealTemplateSource(row, row.ownerId === userId));
  }

  async findByIdVisibleToUser(userId: string, id: string): Promise<MealTemplateSource | null> {
    const row = await this.prisma.mealTemplate.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { visibility: 'SHARED', versions: { some: { approvalStatus: 'APPROVED' } } },
        ],
      },
      include: MEAL_TEMPLATE_DETAIL_INCLUDE,
    });
    return row == null ? null : toMealTemplateSource(row, row.ownerId === userId);
  }
}
