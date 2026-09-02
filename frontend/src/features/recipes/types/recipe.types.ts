export interface RecipeComponent {
  id: string;
  foodId: string;
  foodName: string;
  foodDisplayName: string;
  foodVariantLabel: string | null;
  servingId: string | null;
  servingName: string | null;
  servingGrams: string | null;
  role: string;
  quantity: string;
  unit: 'SERVING' | 'GRAM';
  displayOrder: number;
  notes: string | null;
}

export interface RecipeVersion {
  id: string;
  version: number;
  name: string;
  description: string | null;
  preparationInstructions: string | null;
  cuisine: string | null;
  mealTypes: string[];
  yieldServings: string;
  sourceType: string;
  approvalStatus: string;
  createdAt: string;
  components: RecipeComponent[];
}

export interface Recipe {
  id: string;
  ownerId: string | null;
  visibility: 'PRIVATE' | 'SHARED';
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  versions: RecipeVersion[];
}

export interface RecipeNutrition {
  recipeId: string;
  recipeVersionId: string;
  recipeVersion: number;
  servings: string;
  servingGrams: string;
  nutrients: { name: string; unit: string; amount: string }[];
  ingredients: { ingredientId: string; foodId: string; servingId: string | null; quantity: string; unit: string; grams: string }[];
}

export interface RecipeEvaluation {
  apiVersion: string;
  recipeId: string;
  recipeVersionId: string;
  recipeVersion: number;
  portionGrams: string;
  evaluation: {
    score: number;
    coverage: number;
    evaluationStatus?: 'evaluated' | 'insufficient-evidence';
    reasons: unknown[];
    contributions: unknown[];
    deferredPolicies: unknown[];
    nutritionInsights?: unknown[];
  };
  targetCalculation: unknown;
  provenance: unknown;
  limitations: string[];
}

export interface RecipeIngredientRequest {
  foodId: string;
  servingId?: string;
  quantity: string;
  unit?: 'SERVING' | 'GRAM';
  role?: string;
  notes?: string;
}

export interface RecipeRequest {
  name: string;
  description?: string;
  servings: string;
  preparationInstructions?: string;
  visibility?: 'PRIVATE' | 'SHARED';
  ingredients: RecipeIngredientRequest[];
}
