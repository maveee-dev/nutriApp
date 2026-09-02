import { Injectable } from '@nestjs/common';
import { FoodsRepository } from '../../foods/repositories/foods.repository.js';
import { FoodNotFoundError } from '../../foods/errors/food-not-found.error.js';
import { NutritionPolicyService } from '../../analysis/services/nutrition-policy.service.js';
import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import { FoodEvaluationSource, FoodEvaluationWithContextSource } from '../types/food-evaluation.type.js';
import { Decimal } from 'decimal.js';
import { NutritionEvaluationContext } from '../../analysis/types/nutrition-evaluation-context.type.js';
import { NutritionInsightService } from '../../insights/nutrition-insight.service.js';
import type { FoodEvaluationInput, FoodEvaluationNutrientInput } from '../types/food-evaluation.type.js';

@Injectable()
export class FoodEvaluationService {
  constructor(
    private readonly foodsRepository: FoodsRepository,
    private readonly policyService: NutritionPolicyService,
    private readonly engine: FoodEvaluationEngine,
    private readonly nutritionInsightService: NutritionInsightService = new NutritionInsightService(),
  ) {}

  async evaluate(userId: string, foodId: string, servingId: string, quantity: string): Promise<FoodEvaluationSource> {
    const result = await this.evaluateWithKernelContext(userId, foodId, servingId, quantity);
    return result.evaluation;
  }

  async evaluateWithContext(userId: string, foodId: string, servingId: string, quantity: string, context?: NutritionEvaluationContext): Promise<FoodEvaluationWithContextSource> {
    const food = await this.foodsRepository.findDetailById(foodId);
    if (!food) throw new FoodNotFoundError();
    const serving = food.servings.find((item) => item.id === servingId);
    if (!serving) throw new FoodNotFoundError();
    const targetCalculation = context == null
      ? await this.policyService.calculateForUser(userId)
      : this.policyService.calculateFromContext(context);
    const evaluation = this.engine.evaluate({
      portionGrams: new Decimal(serving.grams).mul(quantity).toString(),
      nutrients: food.nutrients.map((item) => ({
        sourceId: item.nutrient.sourceId,
        name: item.nutrient.name,
        unit: item.nutrient.unit,
        amountPer100Grams: item.amount,
      })),
      targets: targetCalculation.targets,
      targetCalculation,
    });
    return {
      evaluation: {
        ...evaluation,
        nutritionInsights: this.nutritionInsightService.generate({
          evaluation,
          conditionCodes: context?.conditionCodes,
        }),
      },
      targetCalculation,
    };
  }

  /**
   * Kernel-backed path for both the standalone Food Evaluation endpoint and
   * contextual callers such as the planner fallback and snapshot capture.
   */
  private async evaluateWithKernelContext(userId: string, foodId: string, servingId: string, quantity: string, context?: NutritionEvaluationContext): Promise<FoodEvaluationWithContextSource> {
    const food = await this.foodsRepository.findDetailById(foodId);
    if (!food) throw new FoodNotFoundError();
    const serving = food.servings.find((item) => item.id === servingId);
    if (!serving) throw new FoodNotFoundError();
    const targetCalculation = context == null
      ? await this.policyService.calculateForUser(userId)
      : this.policyService.calculateFromContext(context);
    const evaluation = this.engine.evaluateWithKernel({
      portionGrams: new Decimal(serving.grams).mul(quantity).toString(),
      nutrients: food.nutrients.map((item) => ({
        sourceId: item.nutrient.sourceId,
        name: item.nutrient.name,
        unit: item.nutrient.unit,
        amountPer100Grams: item.amount,
      })),
      targets: targetCalculation.targets,
      targetCalculation,
    });
    return {
      evaluation: {
        ...evaluation,
        nutritionInsights: this.nutritionInsightService.generate({
          evaluation,
          conditionCodes: context?.conditionCodes,
        }),
      },
      targetCalculation,
    };
  }

  loadEvaluationContext(userId: string): Promise<NutritionEvaluationContext> {
    return this.policyService.loadContext(userId);
  }

  getPolicySetFingerprint(): string | null {
    return this.policyService.getPolicySetFingerprint();
  }

  /**
   * Evaluates a composed, already-resolved nutrition profile through the same
   * engine used by canonical Food records. Recipe and future composite
   * consumers use this additive seam without fabricating Food or Serving IDs.
   */
  evaluateResolvedComposition(
    input: Pick<FoodEvaluationInput, 'portionGrams' | 'targets' | 'targetCalculation'> & { nutrients: readonly FoodEvaluationNutrientInput[] },
  ): FoodEvaluationSource {
    const evaluation = this.engine.evaluateWithKernel(input);
    return {
      ...evaluation,
      nutritionInsights: this.nutritionInsightService.generate({ evaluation }),
    };
  }
}
