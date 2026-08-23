import type { CreateMealRequest, MealType } from '@/features/meals/types/meals.types';

export interface MealPlanEvaluation {
  score: number;
  evaluationStatus?: 'evaluated' | 'insufficient-evidence';
  coverage: number;
  reasons: { code: string; direction: string; nutrient: string; measuredValue: string; targetValue: string | null; explanation: string }[];
  contributions: { nutrient: string; amount: string; targetValue: string | null; currentDailyValue: string | null; explanation: string }[];
  deferredPolicies?: { policyId: string; reason: string; explanation: string }[];
}

export interface MealPlanItem {
  mealType: MealType;
  foodId: string;
  foodName: string;
  servingId: string;
  servingName: string;
  servingGrams: string;
  quantity: string;
  category: string;
  evaluation: MealPlanEvaluation;
}

export interface MealPlanRecipe {
  recipeId: string | null;
  recipeVersionId: string;
  recipeVersion: number | null;
  name: string;
}

export interface MealPlanMeal {
  mealType: MealType;
  name: string;
  templateId: string;
  templateVersionId: string;
  templateVersion: number;
  recipeVersionIds: string[];
  recipes: MealPlanRecipe[];
  slotSelections: { slotId: string; source: string; sourceId: string; label: string; role?: string }[];
  customization?: { baseTemplateVersionId: string; substitutions: { slotId: string; recipeVersionId: string }[] };
  components: MealPlanItem[];
  evaluation: MealPlanEvaluation;
  provenance: {
    sourceType: string;
    sourceName: string | null;
    sourceUrl: string | null;
    sourceReference: string | null;
    sourceVersion: string | null;
    approvalStatus: string;
    evaluatorVersion: string;
    policySetFingerprint: string | null;
    evaluationFingerprint: string;
  };
}

export interface AvailableRecipeVersion {
  id: string;
  version: number;
  name: string;
  mealTypes: string[];
  approvalStatus: string;
  components: { role: string }[];
}

export interface AvailableRecipe {
  id: string;
  versions: AvailableRecipeVersion[];
}

export interface DailyMealPlan {
  apiVersion: string;
  date: string;
  asOf: string;
  items: MealPlanItem[];
  /** Complete recipe/template meals. Legacy flattened items remain supported. */
  meals?: MealPlanMeal[];
  dailyEvaluation?: MealPlanEvaluation;
  targets: Record<string, string | null | undefined>;
  targetProvenance?: unknown[];
  deferredPolicies: { policyId: string; reason: string; explanation: string }[];
  policySetFingerprint?: string | null;
  provenance: { foodSource: string; selection: string; evaluatorVersion: string; planner?: 'food-fallback' | 'recipe-template' };
  limitations: string[];
}

export interface CustomizeMealPlanRequest {
  templateVersionId: string;
  mealType: MealType;
  substitutions: { slotId: string; recipeVersionId: string }[];
}

export function toMealPlanCreateRequestForMeal(meal: MealPlanMeal, date: string): CreateMealRequest {
  const times: Record<MealType, string> = {
    BREAKFAST: '08:00:00.000Z',
    LUNCH: '12:00:00.000Z',
    DINNER: '18:00:00.000Z',
    SNACK: '15:00:00.000Z',
  };
  return {
    mealType: meal.mealType,
    consumedAt: `${date}T${times[meal.mealType]}`,
    items: meal.components.map((component) => ({ servingId: component.servingId, quantity: component.quantity })),
  };
}

export function toMealPlanCreateRequest(item: MealPlanItem, date: string): CreateMealRequest {
  const times: Record<MealType, string> = {
    BREAKFAST: '08:00:00.000Z',
    LUNCH: '12:00:00.000Z',
    DINNER: '18:00:00.000Z',
    SNACK: '15:00:00.000Z',
  };
  return {
    mealType: item.mealType,
    consumedAt: `${date}T${times[item.mealType]}`,
    items: [{ servingId: item.servingId, quantity: item.quantity }],
  };
}
