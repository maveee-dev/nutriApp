import { Module } from '@nestjs/common';
import { NutritionTargetsModule } from '../targets/nutrition-targets.module.js';
import { RecipesModule } from '../recipes/recipes.module.js';
import { DailyTrackerController } from './controllers/daily-tracker.controller.js';
import { DailyTrackerRepository } from './repositories/daily-tracker.repository.js';
import { DailyTrackerService } from './services/daily-tracker.service.js';

@Module({
  imports: [NutritionTargetsModule, RecipesModule],
  controllers: [DailyTrackerController],
  providers: [DailyTrackerRepository, DailyTrackerService],
  exports: [DailyTrackerService],
})
export class DailyTrackerModule {}
