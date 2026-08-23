import { Decimal } from 'decimal.js';
import { MealEvaluationSnapshotSource } from '../../../../meals/sources/meal-evaluation-snapshot.source.js';
import { decodeMealEvaluationSnapshot } from '../../../../meals/snapshots/meal-evaluation-snapshot.adapter.js';
import { NutritionPolicyDeferralSource, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const DIABETES_CARBOHYDRATE_ADHERENCE_POLICY_ID = 'diabetes-carbohydrate-adherence-v1';
export const DIABETES_CARBOHYDRATE_ADHERENCE_POLICY_VERSION = 'v1';

export interface DiabetesCarbohydrateAdherenceResult {
  readonly status: 'not-applicable' | 'available' | 'deferred';
  readonly targetCarbohydrateGrams: string | null;
  readonly consumedCarbohydrateGrams: string | null;
  readonly remainingCarbohydrateGrams: string | null;
  readonly exceededByGrams: string | null;
  readonly coveragePercentage: number | null;
  readonly targetProvenance: NutritionTargetProvenance | null;
  readonly snapshotIds: readonly string[];
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
}

interface DiabetesCarbohydrateAdherenceInput {
  readonly targetCarbohydrateGrams: string | null;
  readonly targetProvenance: NutritionTargetProvenance | null;
  readonly targetDeferral: NutritionPolicyDeferralSource | null;
  readonly snapshots: readonly MealEvaluationSnapshotSource[];
  readonly expectedMealItemCount: number;
}

/** Calculates daily adherence from immutable evaluation contributions only. */
export class DiabetesCarbohydrateAdherencePolicy {
  calculate(input: DiabetesCarbohydrateAdherenceInput): DiabetesCarbohydrateAdherenceResult {
    const isApplicable = input.targetCarbohydrateGrams != null
      || input.targetProvenance?.target === 'carbohydrateGrams'
      || input.targetDeferral?.policyId === 'diabetes-carbohydrate-target-v1';
    if (!isApplicable) {
      return this.empty('not-applicable');
    }

    if (input.targetCarbohydrateGrams == null) {
      return {
        ...this.empty('deferred'),
        deferredPolicy: {
          policyId: DIABETES_CARBOHYDRATE_ADHERENCE_POLICY_ID,
          reason: input.targetDeferral?.reason ?? 'missing-individualized-carbohydrate-target',
          explanation: 'Daily carbohydrate adherence is deferred until an approved, current individualized carbohydrate target is available.',
        },
      };
    }

    const latestSnapshots = this.latestSnapshots(input.snapshots);
    const coveredSnapshots = latestSnapshots.filter((snapshot) => this.carbohydrateAmount(snapshot) != null);
    if (coveredSnapshots.length < input.expectedMealItemCount) {
      return {
        ...this.empty('deferred'),
        targetCarbohydrateGrams: input.targetCarbohydrateGrams,
        targetProvenance: input.targetProvenance,
        snapshotIds: latestSnapshots.map(({ id }) => id),
        deferredPolicy: {
          policyId: DIABETES_CARBOHYDRATE_ADHERENCE_POLICY_ID,
          reason: 'insufficient-historical-coverage',
          explanation: 'Daily carbohydrate adherence is deferred because one or more meal items do not have a valid immutable carbohydrate evaluation snapshot.',
        },
      };
    }

    const consumed = coveredSnapshots.reduce(
      (total, snapshot) => total.plus(this.carbohydrateAmount(snapshot) ?? 0),
      new Decimal(0),
    );
    const target = new Decimal(input.targetCarbohydrateGrams);
    const difference = target.minus(consumed);
    const remaining = Decimal.max(difference, 0);
    const exceeded = Decimal.max(consumed.minus(target), 0);
    const coverage = input.expectedMealItemCount === 0
      ? 100
      : new Decimal(coveredSnapshots.length).div(input.expectedMealItemCount).mul(100).toDecimalPlaces(2).toNumber();

    return {
      status: 'available',
      targetCarbohydrateGrams: target.toString(),
      consumedCarbohydrateGrams: consumed.toString(),
      remainingCarbohydrateGrams: remaining.toString(),
      exceededByGrams: exceeded.toString(),
      coveragePercentage: coverage,
      targetProvenance: input.targetProvenance,
      snapshotIds: latestSnapshots.map(({ id }) => id),
      deferredPolicy: null,
    };
  }

  private latestSnapshots(snapshots: readonly MealEvaluationSnapshotSource[]): MealEvaluationSnapshotSource[] {
    const latest = new Map<string, MealEvaluationSnapshotSource>();
    for (const snapshot of snapshots) {
      const current = latest.get(snapshot.mealItemId);
      if (current == null || snapshot.evaluatedAt > current.evaluatedAt || (snapshot.evaluatedAt.getTime() === current.evaluatedAt.getTime() && snapshot.id > current.id)) {
        latest.set(snapshot.mealItemId, snapshot);
      }
    }
    return [...latest.values()].sort((left, right) => left.mealItemId.localeCompare(right.mealItemId));
  }

  private carbohydrateAmount(snapshot: MealEvaluationSnapshotSource): Decimal | null {
    const payload = decodeMealEvaluationSnapshot(snapshot);
    const contribution = payload.contributions.find((item) => item.nutrient === 'carbohydrates');
    if (contribution == null) return null;
    try {
      return new Decimal(contribution.amount);
    } catch {
      return null;
    }
  }

  private empty(status: 'not-applicable' | 'deferred'): DiabetesCarbohydrateAdherenceResult {
    return {
      status,
      targetCarbohydrateGrams: null,
      consumedCarbohydrateGrams: null,
      remainingCarbohydrateGrams: null,
      exceededByGrams: null,
      coveragePercentage: null,
      targetProvenance: null,
      snapshotIds: [],
      deferredPolicy: null,
    };
  }
}
