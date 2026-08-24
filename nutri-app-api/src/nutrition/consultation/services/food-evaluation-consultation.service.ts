import { Injectable } from '@nestjs/common';
import { FoodsService } from '../../foods/services/foods.service.js';
import { FoodEvaluationService } from '../../evaluation/services/food-evaluation.service.js';
import type { ServingSource } from '../../servings/sources/serving.source.js';
import type { FoodEntityResolution } from '../types/food-entity-resolution.type.js';
import type { FoodConsultationEvaluation } from '../types/food-consultation-evaluation.type.js';

/**
 * Bridges a confident food entity to the existing deterministic evaluation
 * path. This service owns orchestration and response shaping only.
 */
@Injectable()
export class FoodEvaluationConsultationService {
  constructor(
    private readonly foodsService: FoodsService,
    private readonly foodEvaluationService: FoodEvaluationService,
  ) {}

  async evaluate(
    userId: string,
    resolution: FoodEntityResolution,
  ): Promise<FoodConsultationEvaluation | undefined> {
    if (resolution.status !== 'resolved') return undefined;

    const candidate = resolution.candidates[0];
    if (candidate?.kind !== 'food' || candidate.foodId == null) return undefined;

    const food = await this.foodsService.findDetailById(candidate.foodId);
    // Keep consultation aligned with the existing serving-first UI rule. The
    // first human-readable household serving wins; gram-based servings are a
    // fallback only. This selects an existing Serving and never recalculates
    // any nutrient value.
    const serving = this.preferredServing(food.servings);
    if (serving == null) return undefined;

    const quantity = '1';
    const result = await this.foodEvaluationService.evaluateWithContext(
      userId,
      food.id,
      serving.id,
      quantity,
    );

    return {
      foodId: food.id,
      displayName: food.displayName ?? candidate.displayName,
      variantLabel: food.variantLabel ?? candidate.variantLabel ?? null,
      serving: {
        id: serving.id,
        name: serving.name,
        grams: serving.grams,
        quantity,
      },
      evaluation: result.evaluation,
      targetCalculation: {
        targets: result.targetCalculation.targets,
        adjustments: result.targetCalculation.adjustments,
        deferredPolicies: result.targetCalculation.deferredPolicies,
        ...(result.targetCalculation.targetProvenance == null
          ? {}
          : { targetProvenance: result.targetCalculation.targetProvenance }),
      },
      policySetFingerprint: this.foodEvaluationService.getPolicySetFingerprint(),
    };
  }

  private preferredServing(servings: readonly ServingSource[]): ServingSource | undefined {
    const scored = servings
      .map((serving, index) => ({ serving, index, score: this.householdServingScore(serving.name) }))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index);

    return scored[0]?.serving ?? servings.find((serving) => !this.isGramBased(serving.name)) ?? servings[0];
  }

  private householdServingScore(name: string): number {
    if (this.isGramBased(name)) return -1;

    const normalized = name.trim().replace(/\s+/g, ' ');
    let score = 0;
    if (/\b(?:1|one)\b/i.test(normalized)) score += 3;
    if (/\b(?:small|medium|large|extra large)\b/i.test(normalized)) score += 4;
    if (/\b(?:cup|cups|tbsp|tsp|tablespoon|teaspoon|slice|piece|fillet|breast|leg|bowl|glass|can|packet|ounce|oz)\b/i.test(normalized)) score += 4;
    if (/\b(?:egg|banana|apple|orange|fruit|whole)\b/i.test(normalized)) score += 3;
    if (/\bserving\b/i.test(normalized)) score += 1;
    return score;
  }

  private isGramBased(name: string): boolean {
    return /\b(?:gram|grams|g)\b|per\s*100/i.test(name);
  }
}
