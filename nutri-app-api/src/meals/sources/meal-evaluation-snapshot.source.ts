export interface MealEvaluationSnapshotSource {
  readonly id: string;
  readonly mealItemId: string;
  readonly score: number;
  readonly coverage: number;
  readonly payload: Record<string, unknown>;
  readonly evaluatorVersion: string;
  readonly policyVersion: string;
  readonly snapshotVersion: string;
  readonly evaluatedAt: Date;
}
