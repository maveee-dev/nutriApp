import { Injectable } from '@nestjs/common';
import { RecipeNotFoundError } from '../errors/recipe-not-found.error.js';
import { RecipesRepository } from '../repositories/recipes.repository.js';
import type { RecipeSource } from '../types/recipe.source.js';

@Injectable()
export class RecipesService {
  constructor(private readonly recipesRepository: RecipesRepository) {}

  findMany(userId: string): Promise<RecipeSource[]> {
    return this.recipesRepository.findManyVisibleToUser(userId);
  }

  async findById(userId: string, id: string): Promise<RecipeSource> {
    const recipe = await this.recipesRepository.findByIdVisibleToUser(userId, id);
    if (recipe == null) throw new RecipeNotFoundError();
    return recipe;
  }
}
