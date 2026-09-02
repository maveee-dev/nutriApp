import { Module } from '@nestjs/common';
import { MealsModule } from '../meals/meals.module.js';
import { HealthProfileModule } from '../health-profile/health-profile.module.js';
import { LaboratoryModule } from '../laboratory/laboratory.module.js';
import { NutritionModule } from '../nutrition/nutrition.module.js';
import { DailyTrackerModule } from '../nutrition/daily-tracker/daily-tracker.module.js';
import { MealPlannerModule } from '../nutrition/meal-planner/meal-planner.module.js';
import { RecipesModule } from '../nutrition/recipes/recipes.module.js';
import { HealthDashboardController } from './controllers/health-dashboard.controller.js';
import { HealthDashboardService } from './services/health-dashboard.service.js';

@Module({
  imports: [HealthProfileModule, DailyTrackerModule, NutritionModule, LaboratoryModule, MealPlannerModule, RecipesModule, MealsModule],
  controllers: [HealthDashboardController],
  providers: [HealthDashboardService],
})
export class HealthDashboardModule {}
