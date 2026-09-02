import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module.js';
import { DailyTrackerModule } from '../daily-tracker/daily-tracker.module.js';
import { FoodsModule } from '../foods/foods.module.js';
import { RecipesModule } from '../recipes/recipes.module.js';
import { NutritionModule } from '../nutrition.module.js';
import { MealPlannerController } from './controllers/meal-planner.controller.js';
import { MealPlannerRepository } from './repositories/meal-planner.repository.js';
import { MealPlannerAiExplanationService } from './services/meal-planner-ai-explanation.service.js';
import { MealPlannerService } from './services/meal-planner.service.js';

@Module({
  imports: [AiModule, DailyTrackerModule, FoodsModule, RecipesModule, NutritionModule],
  controllers: [MealPlannerController],
  providers: [MealPlannerRepository, MealPlannerAiExplanationService, MealPlannerService],
  exports: [MealPlannerService],
})
export class MealPlannerModule {}
