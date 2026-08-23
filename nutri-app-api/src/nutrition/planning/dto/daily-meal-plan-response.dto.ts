import { FoodEvaluationContribution, FoodEvaluationReason } from '../../evaluation/types/food-evaluation.type.js';
import { NutritionPolicyDeferralSource, NutritionTargetProvenance, NutritionTargets } from '../../analysis/types/nutrition-targets.type.js';
import { DailyAdherenceDto, MealAssessmentDto } from '../../analysis/dto/daily-nutrition-response.dto.js';

export class MealPlanEvaluationDto {
  score!: number;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence';
  coverage!: number;
  reasons!: readonly FoodEvaluationReason[];
  contributions!: readonly FoodEvaluationContribution[];
}

export class MealPlanItemDto {
  mealType!: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  foodId!: string;
  foodName!: string;
  foodDisplayName!: string;
  foodVariantLabel!: string | null;
  servingId!: string;
  servingName!: string;
  servingGrams!: string;
  quantity!: string;
  category!: string;
  evaluation!: MealPlanEvaluationDto;
}

export class MealPlanRecipeDto {
  /** Stable parent Recipe identity. */
  recipeId!: string | null;
  /** Immutable RecipeVersion identity used for this plan. */
  recipeVersionId!: string;
  recipeVersion!: number | null;
  name!: string;
}

export class MealPlanMealDto {
  mealType!: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  name!: string;
  templateId!: string;
  templateVersionId!: string;
  templateVersion!: number;
  recipeVersionIds!: readonly string[];
  /** Resolved recipes that filled this template's slots. Additive to recipeVersionIds. */
  recipes!: readonly MealPlanRecipeDto[];
  /** Resolved slot identities used to submit a validated substitution. */
  slotSelections!: readonly { slotId: string; source: string; sourceId: string; label: string; role?: string }[];
  customization?: {
    baseTemplateVersionId: string;
    substitutions: readonly { slotId: string; recipeVersionId: string }[];
  };
  components!: readonly MealPlanItemDto[];
  evaluation!: MealPlanEvaluationDto;
  /** Aggregate meal-fit projection supplied by the evaluation layer. */
  mealAssessment?: Omit<MealAssessmentDto, 'mealId'>;
  provenance!: {
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

export class DailyMealPlanResponseDto {
  apiVersion!: string;
  date!: string;
  asOf!: string;
  items!: readonly MealPlanItemDto[];
  /** Complete recipe/template meals. Additive to the legacy flattened items contract. */
  meals?: readonly MealPlanMealDto[];
  dailyEvaluation?: MealPlanEvaluationDto;
  dailyMealAssessment?: Omit<MealAssessmentDto, 'mealId'>;
  dailyAdherence?: DailyAdherenceDto;
  targets!: NutritionTargets;
  targetProvenance?: readonly NutritionTargetProvenance[];
  deferredPolicies!: readonly NutritionPolicyDeferralSource[];
  policySetFingerprint?: string | null;
  provenance!: {
    foodSource: string;
    selection: string;
    evaluatorVersion: string;
    planner?: 'food-fallback' | 'recipe-template';
  };
  limitations!: readonly string[];
}
