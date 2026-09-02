import { Injectable } from '@nestjs/common';
import { RecipeEvaluationValidationError } from '../errors/recipe-evaluation-validation.error.js';
import { RecipesService } from './recipes.service.js';
import { RecipeCalculator } from './recipe-calculator.js';
import type { RecipeNutritionSource } from '../types/recipe-nutrition.source.js';

@Injectable()
export class RecipeNutritionService {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly calculator: RecipeCalculator,
  ) {}

  async calculate(userId: string, recipeId: string, requestedVersion?: number): Promise<RecipeNutritionSource> {
    const recipe = await this.recipesService.findById(userId, recipeId);
    const version = requestedVersion == null
      ? recipe.versions[0]
      : recipe.versions.find((item) => item.version === requestedVersion);
    if (version == null) throw new RecipeEvaluationValidationError('Requested recipe version is not available.');
    return this.calculator.calculate(version);
  }
}
