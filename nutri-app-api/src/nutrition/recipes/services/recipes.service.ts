import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { FoodsService } from '../../foods/services/foods.service.js';
import { RecipeNotFoundError } from '../errors/recipe-not-found.error.js';
import { RecipesRepository, RecipeWriteInput } from '../repositories/recipes.repository.js';
import type { RecipeSource } from '../types/recipe.source.js';

@Injectable()
export class RecipesService {
  constructor(
    private readonly recipesRepository: RecipesRepository,
    @Optional() private readonly foodsService?: FoodsService,
  ) {}

  findMany(userId: string): Promise<RecipeSource[]> {
    return this.recipesRepository.findManyVisibleToUser(userId);
  }

  findOwnedByUser(userId: string): Promise<RecipeSource[]> {
    return this.recipesRepository.findOwnedByUser(userId);
  }

  async findById(userId: string, id: string): Promise<RecipeSource> {
    const recipe = await this.recipesRepository.findByIdVisibleToUser(userId, id);
    if (recipe == null) throw new RecipeNotFoundError();
    return recipe;
  }

  async create(userId: string, input: RecipeWriteInput): Promise<RecipeSource> {
    this.validateInput(input);
    await this.validateIngredients(input.ingredients);
    return this.recipesRepository.createOwned(userId, input);
  }

  async update(userId: string, id: string, input: RecipeWriteInput, updateFavorite?: boolean): Promise<RecipeSource> {
    this.validateInput(input);
    await this.validateIngredients(input.ingredients);
    const recipe = await this.recipesRepository.updateOwned(userId, id, input, updateFavorite);
    if (recipe == null) throw new RecipeNotFoundError();
    return recipe;
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.recipesRepository.deleteOwned(userId, id))) throw new RecipeNotFoundError();
  }

  private validateInput(input: RecipeWriteInput): void {
    if (input.name.trim().length === 0) throw new BadRequestException('Recipe name is required.');
    const servings = new Decimal(input.servings);
    if (!servings.isFinite() || !servings.gt(0)) throw new BadRequestException('Recipe servings must be a positive number.');
    if (input.ingredients.length === 0) throw new BadRequestException('At least one recipe ingredient is required.');
    for (const ingredient of input.ingredients) {
      const quantity = new Decimal(ingredient.quantity);
      if (!quantity.isFinite() || !quantity.gt(0)) throw new BadRequestException('Ingredient quantities must be positive.');
      if (ingredient.unit === 'SERVING' && ingredient.servingId == null) throw new BadRequestException('Serving-based ingredients require a servingId.');
    }
  }

  private async validateIngredients(ingredients: readonly RecipeWriteInput['ingredients'][number][]): Promise<void> {
    if (this.foodsService == null) return;
    await Promise.all(ingredients.map(async (ingredient) => {
      const food = await this.foodsService!.findDetailById(ingredient.foodId);
      if (ingredient.unit === 'SERVING' && !food.servings.some((serving) => serving.id === ingredient.servingId)) {
        throw new BadRequestException('An ingredient serving must belong to its selected food.');
      }
    }));
  }
}
