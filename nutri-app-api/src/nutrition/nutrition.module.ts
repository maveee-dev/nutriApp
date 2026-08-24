import { Module } from '@nestjs/common';
import { FoodsModule } from './foods/foods.module.js';
import { RecipesModule } from './recipes/recipes.module.js';
import { RecipesController } from './recipes/controllers/recipes.controller.js';
import { RecipeEvaluationService } from './recipes/services/recipe-evaluation.service.js';
import { MealTemplatesModule } from './meal-templates/meal-templates.module.js';
import { MealTemplatesController } from './meal-templates/controllers/meal-templates.controller.js';
import { NutrientsModule } from './nutrients/nutrients.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ServingsModule } from './servings/servings.module.js';
import { NutritionAnalysisController } from './analysis/controllers/nutrition-analysis.controller.js';
import { NutritionAnalysisRepository } from './analysis/repositories/nutrition-analysis.repository.js';
import { NutritionAnalysisService } from './analysis/services/nutrition-analysis.service.js';
import { NutritionCalculator } from './analysis/services/nutrition-calculator.js';
import { NutritionTargetCalculator } from './analysis/services/nutrition-target-calculator.js';
import { NutritionPolicyService } from './analysis/services/nutrition-policy.service.js';
import { ProfilesModule } from '../profiles/profiles.module.js';
import { ConditionsModule } from '../conditions/conditions.module.js';
import { LaboratoryModule } from '../laboratory/laboratory.module.js';
import { DialysisModule } from '../dialysis/dialysis.module.js';
import { FoodEvaluationService } from './evaluation/services/food-evaluation.service.js';
import { FoodEvaluationEngine } from './evaluation/services/food-evaluation.engine.js';
import { FoodEvaluationController } from './evaluation/controllers/food-evaluation.controller.js';
import { RecommendationService } from './recommendations/recommendation.service.js';
import { RecommendationsController } from './recommendations/controllers/recommendations.controller.js';
import { createRecommendationPolicyRegistrations } from './recommendations/recommendation-registrations.js';
import { RECOMMENDATION_POLICY_REGISTRATIONS } from './recommendations/recommendation.tokens.js';
import { DeterministicRecommendationResolver } from './recommendations/services/deterministic-recommendation.resolver.js';
import { DiabetesCarbohydrateTargetRepository } from './analysis/repositories/diabetes-carbohydrate-target.repository.js';
import { MealEvaluationSnapshotRepository } from '../meals/repositories/meal-evaluation-snapshot.repository.js';
import { NutritionTargetResolver } from './analysis/services/nutrition-target.resolver.js';
import { createNutritionTargetPolicyRegistrations } from './analysis/services/nutrition-target-registrations.js';
import { NUTRITION_TARGET_POLICY_REGISTRATIONS } from './analysis/services/nutrition-target.tokens.js';
import { createDailyNutritionProjectionRegistrations } from './analysis/services/daily-nutrition-projection-registrations.js';
import { DAILY_NUTRITION_PROJECTION_REGISTRATIONS } from './analysis/services/daily-nutrition-projection.tokens.js';
import { NUTRITION_EVIDENCE_PROVIDERS } from './analysis/services/nutrition-evidence.tokens.js';
import { DiabetesNutritionEvidenceProvider, IndividualizedTargetsNutritionEvidenceProvider, RenalNutritionEvidenceProvider } from './analysis/services/nutrition-evidence.providers.js';
import { IndividualizedNutritionTargetEvidenceRepository } from './analysis/repositories/individualized-nutrition-target-evidence.repository.js';
import { NutritionConsultationController } from './consultation/controllers/nutrition-consultation.controller.js';
import { NutritionConsultationService } from './consultation/services/nutrition-consultation.service.js';
import { FoodRecognitionController } from './food-recognition/controllers/food-recognition.controller.js';
import { FoodRecognitionService } from './food-recognition/services/food-recognition.service.js';
import { NoopFoodRecognitionProvider } from './food-recognition/services/noop-food-recognition.provider.js';
import { FOOD_RECOGNITION_PROVIDER } from './food-recognition/types/food-recognition.tokens.js';
import { AiNutritionConsultationService } from './consultation/services/ai-nutrition-consultation.service.js';
import { AiNutritionConsultationProviderAdapter } from './consultation/services/ai-nutrition-consultation-provider.adapter.js';
import { ConsultationIntentRouter } from './consultation/services/consultation-intent.router.js';
import { FoodEntityResolver } from './consultation/services/food-entity-resolver.js';
import { NUTRITION_CONSULTATION_AI_PROVIDER } from './consultation/types/nutrition-consultation-ai.tokens.js';
import { AiModule } from '../ai/ai.module.js';
import { MealPlanningController } from './planning/controllers/meal-planning.controller.js';
import { MealPlanningService } from './planning/services/meal-planning.service.js';
import { ShadowMealPlanningService } from './planning/shadow/services/shadow-meal-planning.service.js';
import { PlannerComparisonService } from './planning/comparison/services/planner-comparison.service.js';
import { ShadowDailyAggregateEvaluationService } from './planning/shadow/services/shadow-daily-aggregate-evaluation.service.js';
import { ShadowPlanningProfilerService } from './planning/shadow/services/shadow-planning-profiler.service.js';
import { ShadowClinicalFixtureValidationService } from './planning/shadow/validation/shadow-clinical-validation.service.js';
import { ShadowHistoricalReplayService } from './planning/shadow/replay/shadow-historical-replay.service.js';

@Module({
  imports: [FoodsModule, RecipesModule, MealTemplatesModule, NutrientsModule, CategoriesModule, ServingsModule, ProfilesModule, ConditionsModule, LaboratoryModule, DialysisModule, AiModule],
  controllers: [NutritionAnalysisController, FoodEvaluationController, RecommendationsController, NutritionConsultationController, FoodRecognitionController, MealPlanningController, RecipesController, MealTemplatesController],
  providers: [
    NutritionAnalysisRepository,
    NutritionAnalysisService,
    NutritionCalculator,
    NutritionTargetCalculator,
    NutritionTargetResolver,
    NutritionPolicyService,
    DiabetesCarbohydrateTargetRepository,
    IndividualizedNutritionTargetEvidenceRepository,
    DiabetesNutritionEvidenceProvider,
    RenalNutritionEvidenceProvider,
    IndividualizedTargetsNutritionEvidenceProvider,
    MealEvaluationSnapshotRepository,
    {
      provide: NUTRITION_TARGET_POLICY_REGISTRATIONS,
      useFactory: createNutritionTargetPolicyRegistrations,
    },
    {
      provide: DAILY_NUTRITION_PROJECTION_REGISTRATIONS,
      useFactory: createDailyNutritionProjectionRegistrations,
      inject: [FoodEvaluationEngine],
    },
    {
      provide: NUTRITION_EVIDENCE_PROVIDERS,
      useFactory: (diabetes: DiabetesNutritionEvidenceProvider, renal: RenalNutritionEvidenceProvider, individualized: IndividualizedTargetsNutritionEvidenceProvider) => [diabetes, renal, individualized],
      inject: [DiabetesNutritionEvidenceProvider, RenalNutritionEvidenceProvider, IndividualizedTargetsNutritionEvidenceProvider],
    },
    FoodEvaluationService,
    FoodEvaluationEngine,
    DeterministicRecommendationResolver,
    {
      provide: RECOMMENDATION_POLICY_REGISTRATIONS,
      useFactory: createRecommendationPolicyRegistrations,
    },
    RecommendationService,
    NutritionConsultationService,
    FoodRecognitionService,
    MealPlanningService,
    ShadowMealPlanningService,
    PlannerComparisonService,
    ShadowDailyAggregateEvaluationService,
    ShadowPlanningProfilerService,
    ShadowClinicalFixtureValidationService,
    ShadowHistoricalReplayService,
    RecipeEvaluationService,
    NoopFoodRecognitionProvider,
    { provide: FOOD_RECOGNITION_PROVIDER, useExisting: NoopFoodRecognitionProvider },
    AiNutritionConsultationService,
    AiNutritionConsultationProviderAdapter,
    ConsultationIntentRouter,
    FoodEntityResolver,
    {
      provide: NUTRITION_CONSULTATION_AI_PROVIDER,
      useExisting: AiNutritionConsultationProviderAdapter,
    },
  ],
  exports: [FoodEvaluationService, RecommendationService],
})
export class NutritionModule {}
