import { Injectable } from '@nestjs/common';
import { ConditionsRepository } from '../../../conditions/repositories/conditions.repository.js';
import { LaboratoryResultsService } from '../../../laboratory/services/laboratory-results.service.js';
import { UserDialysisStatusRepository } from '../../../dialysis/repositories/user-dialysis-status.repository.js';
import { ProfilesRepository } from '../../../profiles/repositories/profiles.repository.js';
import { FoodsRepository } from '../../foods/repositories/foods.repository.js';
import { FoodNotFoundError } from '../../foods/errors/food-not-found.error.js';
import { NutritionTargetCalculator } from '../../analysis/services/nutrition-target-calculator.js';
import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import { FoodEvaluationSource } from '../types/food-evaluation.type.js';
import { Decimal } from 'decimal.js';

@Injectable()
export class FoodEvaluationService {
  constructor(
    private readonly foodsRepository: FoodsRepository,
    private readonly profilesRepository: ProfilesRepository,
    private readonly conditionsRepository: ConditionsRepository,
    private readonly laboratoryResultsService: LaboratoryResultsService,
    private readonly dialysisStatusRepository: UserDialysisStatusRepository,
    private readonly targetCalculator: NutritionTargetCalculator,
    private readonly engine: FoodEvaluationEngine,
  ) {}

  async evaluate(userId: string, foodId: string, servingId: string, quantity: string): Promise<FoodEvaluationSource> {
    const food = await this.foodsRepository.findDetailById(foodId);
    if (!food) throw new FoodNotFoundError();
    const serving = food.servings.find((item) => item.id === servingId);
    if (!serving) throw new FoodNotFoundError();
    const [profile, conditions, egfr, dialysis] = await Promise.all([
      this.profilesRepository.getMyProfile(userId),
      this.conditionsRepository.findUserConditions(userId),
      this.laboratoryResultsService.findLatestEgfr(userId),
      this.dialysisStatusRepository.findByUserId(userId),
    ]);
    const targetCalculation = this.targetCalculator.calculate(
      profile,
      conditions.map(({ condition }) => condition.code),
      egfr,
      dialysis?.status ?? null,
    );
    return this.engine.evaluate({
      portionGrams: new Decimal(serving.grams).mul(quantity).toString(),
      nutrients: food.nutrients.map((item) => ({
        name: item.nutrient.name,
        unit: item.nutrient.unit,
        amountPer100Grams: item.amount,
      })),
      targets: targetCalculation.targets,
      targetCalculation,
    });
  }
}
