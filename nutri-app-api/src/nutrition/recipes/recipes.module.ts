import { Module } from '@nestjs/common';
import { RecipesController } from './controllers/recipes.controller.js';
import { RecipesRepository } from './repositories/recipes.repository.js';
import { RecipesService } from './services/recipes.service.js';
import { RecipeCalculator } from './services/recipe-calculator.js';
import { RecipeNutritionService } from './services/recipe-nutrition.service.js';
import { FoodsModule } from '../foods/foods.module.js';

@Module({
  imports: [FoodsModule],
  providers: [RecipesRepository, RecipesService, RecipeCalculator, RecipeNutritionService],
  exports: [RecipesRepository, RecipesService, RecipeCalculator, RecipeNutritionService],
})
export class RecipesModule {}
