import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RECIPE_DETAIL_INCLUDE } from './recipe.prisma.js';
import { toRecipeSource } from '../mappers/repository/recipe-repository.mapper.js';
import type { RecipeSource } from '../types/recipe.source.js';

@Injectable()
export class RecipesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyVisibleToUser(userId: string): Promise<RecipeSource[]> {
    const rows = await this.prisma.recipe.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { visibility: 'SHARED', versions: { some: { approvalStatus: 'APPROVED' } } },
        ],
      },
      include: RECIPE_DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toRecipeSource(row, row.ownerId === userId));
  }

  async findByIdVisibleToUser(userId: string, id: string): Promise<RecipeSource | null> {
    const row = await this.prisma.recipe.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { visibility: 'SHARED', versions: { some: { approvalStatus: 'APPROVED' } } },
        ],
      },
      include: RECIPE_DETAIL_INCLUDE,
    });
    return row == null ? null : toRecipeSource(row, row.ownerId === userId);
  }
}
