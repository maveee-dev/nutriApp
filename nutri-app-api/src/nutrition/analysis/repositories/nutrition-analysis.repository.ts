import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { NutritionAnalysisMealSource } from '../sources/nutrition-analysis.source.js';
import { MEAL_ANALYSIS_INCLUDE } from './nutrition-analysis.prisma.js';
import { NutritionAnalysisRepositoryMapper } from '../mappers/repository/nutrition-analysis-repository.mapper.js';

@Injectable()
export class NutritionAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMealsForDateRange(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<NutritionAnalysisMealSource[]> {
    const meals = await this.prisma.mealLog.findMany({
      where: { userId, consumedAt: { gte: start, lt: end } },
      orderBy: { consumedAt: 'asc' },
      include: MEAL_ANALYSIS_INCLUDE,
    });

    return meals.map(NutritionAnalysisRepositoryMapper.toMealSource);
  }
}
