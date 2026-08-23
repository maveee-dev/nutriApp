import { Injectable } from '@nestjs/common';
import { FoodsRepository } from '../../foods/repositories/foods.repository.js';
import { FoodNotFoundError } from '../../foods/errors/food-not-found.error.js';
import { NutritionPolicyService } from '../../analysis/services/nutrition-policy.service.js';
import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import { FoodEvaluationSource, FoodEvaluationWithContextSource } from '../types/food-evaluation.type.js';
import { Decimal } from 'decimal.js';
import { NutritionEvaluationContext } from '../../analysis/types/nutrition-evaluation-context.type.js';

@Injectable()
export class FoodEvaluationService {
  constructor(
    private readonly foodsRepository: FoodsRepository,
    private readonly policyService: NutritionPolicyService,
    private readonly engine: FoodEvaluationEngine,
  ) {}

  async evaluate(userId: string, foodId: string, servingId: string, quantity: string): Promise<FoodEvaluationSource> {
    const result = await this.evaluateWithContext(userId, foodId, servingId, quantity);
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
        name: item.nutrient.name,
        unit: item.nutrient.unit,
        amountPer100Grams: item.amount,
      })),
      targets: targetCalculation.targets,
      targetCalculation,
    });
    return { evaluation, targetCalculation };
  }

  loadEvaluationContext(userId: string): Promise<NutritionEvaluationContext> {
    return this.policyService.loadContext(userId);
  }

  getPolicySetFingerprint(): string | null {
    return this.policyService.getPolicySetFingerprint();
  }
}
