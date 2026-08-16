import { Module } from '@nestjs/common';
import { FoodsModule } from './foods/foods.module.js';
import { NutrientsModule } from './nutrients/nutrients.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ServingsModule } from './servings/servings.module.js';
import { NutritionAnalysisController } from './analysis/controllers/nutrition-analysis.controller.js';
import { NutritionAnalysisRepository } from './analysis/repositories/nutrition-analysis.repository.js';
import { NutritionAnalysisService } from './analysis/services/nutrition-analysis.service.js';
import { NutritionCalculator } from './analysis/services/nutrition-calculator.js';
import { NutritionInsightEngine } from './analysis/services/nutrition-insight-engine.js';
import { NutritionTargetCalculator } from './analysis/services/nutrition-target-calculator.js';
import { ProfilesModule } from '../profiles/profiles.module.js';
import { ConditionsModule } from '../conditions/conditions.module.js';
import { LaboratoryModule } from '../laboratory/laboratory.module.js';
import { DialysisModule } from '../dialysis/dialysis.module.js';
import { FoodEvaluationService } from './evaluation/services/food-evaluation.service.js';
import { FoodEvaluationEngine } from './evaluation/services/food-evaluation.engine.js';
import { FoodEvaluationController } from './evaluation/controllers/food-evaluation.controller.js';

@Module({
  imports: [FoodsModule, NutrientsModule, CategoriesModule, ServingsModule, ProfilesModule, ConditionsModule, LaboratoryModule, DialysisModule],
  controllers: [NutritionAnalysisController, FoodEvaluationController],
  providers: [NutritionAnalysisRepository, NutritionAnalysisService, NutritionCalculator, NutritionInsightEngine, NutritionTargetCalculator, FoodEvaluationService, FoodEvaluationEngine],
})
export class NutritionModule {}
