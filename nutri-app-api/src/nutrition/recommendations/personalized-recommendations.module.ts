import { Module } from '@nestjs/common';
import { DailyTrackerModule } from '../daily-tracker/daily-tracker.module.js';
import { FoodsModule } from '../foods/foods.module.js';
import { NutritionModule } from '../nutrition.module.js';
import { NutritionTargetsModule } from '../targets/nutrition-targets.module.js';
import { HealthProfileModule } from '../../health-profile/health-profile.module.js';
import { RecipesModule } from '../recipes/recipes.module.js';
import { LaboratoryModule } from '../../laboratory/laboratory.module.js';
import { PersonalizedRecommendationController } from './personalized/controllers/personalized-recommendation.controller.js';
import { PersonalizedRecommendationService } from './personalized/services/personalized-recommendation.service.js';

@Module({
  imports: [DailyTrackerModule, FoodsModule, RecipesModule, NutritionModule, NutritionTargetsModule, HealthProfileModule, LaboratoryModule],
  controllers: [PersonalizedRecommendationController],
  providers: [PersonalizedRecommendationService],
  exports: [PersonalizedRecommendationService],
})
export class PersonalizedRecommendationsModule {}
