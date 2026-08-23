import { Module } from '@nestjs/common';
import { MealsService } from './services/meals.service.js';
import { MealsController } from './controllers/meals.controller.js';
import { MealsRepository } from './repositories/meals.repository.js';
import { MealEvaluationSnapshotRepository } from './repositories/meal-evaluation-snapshot.repository.js';
import { MealEvaluationSnapshotService } from './services/meal-evaluation-snapshot.service.js';
import { NutritionModule } from '../nutrition/nutrition.module.js';

@Module({
  imports: [NutritionModule],
  providers: [
    MealsService,
    MealsRepository,
    MealEvaluationSnapshotRepository,
    MealEvaluationSnapshotService,
  ],
  controllers: [MealsController]
})
export class MealsModule {}
