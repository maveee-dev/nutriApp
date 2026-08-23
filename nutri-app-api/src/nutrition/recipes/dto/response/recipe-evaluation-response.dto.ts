export class RecipeEvaluationResponseDto {
  apiVersion!: string;
  recipeId!: string;
  recipeVersionId!: string;
  recipeVersion!: number;
  portionGrams!: string;
  evaluation!: {
    score: number;
    coverage: number;
    reasons: readonly unknown[];
    contributions: readonly unknown[];
    deferredPolicies: readonly unknown[];
  };
  targetCalculation!: {
    targets: unknown;
    targetProvenance?: readonly unknown[];
    deferredPolicies: readonly unknown[];
  };
  components!: readonly {
    componentId: string;
    foodId: string;
    servingId: string | null;
    quantity: string;
    unit: string;
    portionGrams: string;
    evaluation: unknown;
  }[];
  provenance!: {
    evaluatorVersion: string;
    policySetFingerprint: string | null;
    recipeFingerprint: string;
    canonicalFoods: readonly unknown[];
  };
  limitations!: readonly string[];
}
