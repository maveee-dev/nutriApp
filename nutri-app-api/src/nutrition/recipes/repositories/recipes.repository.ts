import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RECIPE_DETAIL_INCLUDE } from './recipe.prisma.js';
import { toRecipeSource } from '../mappers/repository/recipe-repository.mapper.js';
import type { RecipeSource } from '../types/recipe.source.js';

export interface RecipeWriteIngredient {
  readonly foodId: string;
  readonly servingId?: string;
  readonly quantity: string;
  readonly unit: 'SERVING' | 'GRAM';
  readonly role: 'MAIN_DISH' | 'STAPLE' | 'SIDE_DISH' | 'SOUP' | 'FRUIT' | 'DRINK' | 'INGREDIENT';
  readonly notes?: string;
}

export interface RecipeWriteInput {
  readonly name: string;
  readonly description?: string;
  readonly servings: string;
  readonly preparationInstructions?: string;
  readonly visibility?: 'PRIVATE' | 'SHARED';
  readonly isFavorite?: boolean;
  readonly ingredients: readonly RecipeWriteIngredient[];
}

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

  async findOwnedByUser(userId: string): Promise<RecipeSource[]> {
    const rows = await this.prisma.recipe.findMany({
      where: { ownerId: userId },
      include: RECIPE_DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toRecipeSource(row, true));
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

  async createOwned(userId: string, input: RecipeWriteInput): Promise<RecipeSource> {
    const recipe = await this.prisma.recipe.create({
      data: {
        ownerId: userId,
        visibility: input.visibility ?? 'PRIVATE',
        isFavorite: input.isFavorite ?? false,
      },
      select: { id: true },
    });
    await this.prisma.recipeVersion.create({
      data: this.versionCreateData(recipe.id, 1, input),
    });
    return (await this.findByIdVisibleToUser(userId, recipe.id))!;
  }

  async updateOwned(userId: string, id: string, input: RecipeWriteInput, updateFavorite?: boolean): Promise<RecipeSource | null> {
    const current = await this.prisma.recipe.findFirst({
      where: { id, ownerId: userId },
      include: RECIPE_DETAIL_INCLUDE,
    });
    if (current == null) return null;
    const latest = current.versions[0];
    if (latest == null) return null;

    if (updateFavorite != null || input.visibility != null) {
      await this.prisma.recipe.update({
        where: { id },
        data: {
          ...(updateFavorite == null ? {} : { isFavorite: updateFavorite }),
          ...(input.visibility == null ? {} : { visibility: input.visibility }),
        },
      });
    }

    await this.prisma.recipeVersion.create({
      data: this.versionCreateData(id, latest.version + 1, {
        name: input.name,
        description: input.description,
        servings: input.servings,
        preparationInstructions: input.preparationInstructions,
        ingredients: input.ingredients,
      }),
    });
    return this.findByIdVisibleToUser(userId, id);
  }

  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const deleted = await this.prisma.recipe.deleteMany({ where: { id, ownerId: userId } });
    return deleted.count > 0;
  }

  private versionCreateData(recipeId: string, version: number, input: RecipeWriteInput) {
    return {
      recipeId,
      version,
      name: input.name,
      description: input.description ?? null,
      preparationInstructions: input.preparationInstructions ?? null,
      cuisine: null,
      mealTypes: [],
      yieldServings: new Decimal(input.servings),
      sourceType: 'USER_CREATED' as const,
      sourceName: null,
      sourceUrl: null,
      sourceReference: null,
      sourceVersion: null,
      approvalStatus: 'APPROVED' as const,
      approvedAt: new Date(),
      approvedByUserId: null,
      components: {
        create: input.ingredients.map((ingredient, index) => ({
          foodId: ingredient.foodId,
          servingId: ingredient.unit === 'SERVING' ? ingredient.servingId : null,
          role: ingredient.role,
          quantity: new Decimal(ingredient.quantity),
          unit: ingredient.unit,
          displayOrder: index,
          notes: ingredient.notes ?? null,
        })),
      },
    };
  }
}
