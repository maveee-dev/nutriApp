import { Injectable } from '@nestjs/common';
import { FoodEvaluationService } from '../../nutrition/evaluation/services/food-evaluation.service.js';
import { MealItemSource } from '../sources/meal-item.source.js';
import { MealEvaluationSnapshotRepository } from '../repositories/meal-evaluation-snapshot.repository.js';
import { MealEvaluationSnapshotSource } from '../sources/meal-evaluation-snapshot.source.js';
import { createNutritionSnapshotFingerprint } from '../../nutrition/analysis/services/nutrition-policy-set-fingerprint.js';
import { Prisma } from '../../../generated/prisma/client.js';

const EVALUATOR_VERSION = 'food-evaluation-v3';
const POLICY_VERSION = 'nutrition-policies-v1';
const SNAPSHOT_VERSION = '1';

@Injectable()
export class MealEvaluationSnapshotService {
  constructor(
    private readonly evaluationService: FoodEvaluationService,
    private readonly repository: MealEvaluationSnapshotRepository,
  ) {}

  async captureForMealItem(userId: string, item: MealItemSource): Promise<MealEvaluationSnapshotSource> {
    const context = this.evaluationService.loadEvaluationContext == null
      ? undefined
      : await this.evaluationService.loadEvaluationContext(userId);
    return this.captureForMealItemWithContext(userId, item, context);
  }

  async captureForMealItems(userId: string, items: readonly MealItemSource[]): Promise<readonly MealEvaluationSnapshotSource[]> {
    if (this.evaluationService.loadEvaluationContext == null) {
      return Promise.all(items.map((item) => this.captureForMealItem(userId, item)));
    }
    const context = await this.evaluationService.loadEvaluationContext(userId);
    return Promise.all(items.map((item) => this.captureForMealItemWithContext(userId, item, context)));
  }

  private async captureForMealItemWithContext(userId: string, item: MealItemSource, context?: Awaited<ReturnType<FoodEvaluationService['loadEvaluationContext']>>): Promise<MealEvaluationSnapshotSource> {
    const { evaluation, targetCalculation } = await this.evaluationService.evaluateWithContext(
      userId,
      item.food.id,
      item.serving.id,
      item.quantity,
      context,
    );
    const policySetFingerprint = this.evaluationService.getPolicySetFingerprint?.() ?? null;
    const snapshotFingerprint = policySetFingerprint == null ? null : createNutritionSnapshotFingerprint({
      evaluatorVersion: EVALUATOR_VERSION,
      policySetFingerprint,
      snapshotVersion: SNAPSHOT_VERSION,
    });

    return this.repository.create({
      mealItemId: item.id,
      score: evaluation.score,
      coverage: evaluation.coverage,
      payload: {
        reasons: evaluation.reasons.map((reason) => ({ ...reason })),
        contributions: evaluation.contributions.map((contribution) => ({ ...contribution })),
        evaluationStatus: evaluation.evaluationStatus ?? 'evaluated',
        targets: { ...targetCalculation.targets },
        deferredPolicies: evaluation.deferredPolicies.map((policy) => ({ ...policy })),
        goal: targetCalculation.energyGoal ?? null,
        targetProvenance: (targetCalculation.targetProvenance ?? []).map((provenance) => ({ ...provenance })),
        ...(targetCalculation.resolvedRules == null ? {} : {
          resolvedRules: JSON.parse(JSON.stringify(targetCalculation.resolvedRules)) as Prisma.InputJsonValue,
        }),
        ...(policySetFingerprint == null ? {} : { policySetFingerprint }),
        ...(snapshotFingerprint == null ? {} : { snapshotFingerprint }),
      },
      evaluatorVersion: EVALUATOR_VERSION,
      policyVersion: POLICY_VERSION,
      snapshotVersion: SNAPSHOT_VERSION,
      evaluatedAt: new Date(),
    });
  }
}
