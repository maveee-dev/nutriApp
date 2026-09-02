import { createHash } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { FoodsService } from '../../foods/services/foods.service.js';
import { NutritionPolicyService } from '../../analysis/services/nutrition-policy.service.js';
import { FoodEvaluationEngine } from '../../evaluation/services/food-evaluation.engine.js';
import { FoodEvaluationService } from '../../evaluation/services/food-evaluation.service.js';
import type { FoodEvaluationNutrientInput } from '../../evaluation/types/food-evaluation.type.js';
import { RecipeEvaluationValidationError } from '../errors/recipe-evaluation-validation.error.js';
import { RecipesService } from './recipes.service.js';
import { RecipeCalculator } from './recipe-calculator.js';
import type { RecipeComponentSource, RecipeVersionSource } from '../types/recipe.source.js';
import type { RecipeEvaluationSource } from '../types/recipe-evaluation.source.js';
import { MealAssessmentProjection } from '../../analysis/services/meal-assessment.projection.js';
import { authoritativeNutrientKey, selectAuthoritativeNutrientInputs } from '../../analysis/services/authoritative-nutrient-input.js';

const EVALUATOR_VERSION = 'food-evaluation-v3';

export interface RecipeEvaluationOptions {
  readonly targetCalculation?: import('../../analysis/types/nutrition-targets.type.js').NutritionTargetCalculation;
  readonly policySetFingerprint?: string | null;
  /** Historical replay can omit a current Meal Assessment when no stored projection exists. */
  readonly includeMealAssessment?: boolean;
}

@Injectable()
export class RecipeEvaluationService {
  private readonly mealAssessmentProjection = new MealAssessmentProjection();

  constructor(
    private readonly recipesService: RecipesService,
    private readonly foodsService: FoodsService,
    private readonly policyService: NutritionPolicyService,
    private readonly engine: FoodEvaluationEngine,
    @Optional() private readonly recipeCalculator?: RecipeCalculator,
    @Optional() private readonly foodEvaluationService?: FoodEvaluationService,
  ) {}

  async evaluate(
    userId: string,
    recipeId: string,
    requestedVersion?: number,
    requestedServings = '1',
    requestedVersionId?: string,
  ): Promise<RecipeEvaluationSource> {
    const recipe = await this.recipesService.findById(userId, recipeId);
    const version = this.selectVersion(recipe.versions, requestedVersion, requestedVersionId);
    return this.evaluateComposition(userId, {
      recipeId,
      recipeVersionId: version.id,
      recipeVersion: version.version,
      yieldServings: version.yieldServings,
      components: version.components,
    }, undefined, requestedServings);
  }

  /**
   * Evaluates an in-memory composition through the same canonical-food and
   * policy pipeline used by persisted RecipeVersions. Shadow planning uses
   * this entry point without creating or exposing a persisted recipe.
   */
  async evaluateComposition(
    userId: string,
    input: {
      readonly recipeId: string;
      readonly recipeVersionId: string;
      readonly recipeVersion: number;
      readonly yieldServings: string;
      readonly components: readonly RecipeComponentSource[];
    },
    options?: RecipeEvaluationOptions,
    requestedServings = '1',
  ): Promise<RecipeEvaluationSource> {
    const targetCalculation = options?.targetCalculation ?? this.policyService.calculateFromContext(await this.policyService.loadContext(userId, 'maintenance'));
    const version: RecipeVersionSource = {
      id: input.recipeVersionId,
      recipeId: input.recipeId,
      version: input.recipeVersion,
      name: 'In-memory recipe composition',
      description: null,
      preparationInstructions: null,
      cuisine: null,
      mealTypes: [],
      yieldServings: input.yieldServings,
      sourceType: 'USER_CREATED',
      sourceName: null,
      sourceUrl: null,
      sourceReference: null,
      sourceVersion: null,
      approvalStatus: 'APPROVED',
      approvedAt: null,
      approvedByUserId: null,
      createdAt: new Date(0),
      components: input.components,
    };
    const calculator = this.recipeCalculator ?? new RecipeCalculator(this.foodsService);
    const calculated = await calculator.calculateWithDetails(version, requestedServings);
    const portionGrams = new Decimal(calculated.servingGrams);
    const profile = this.toNutrientsPer100Grams(calculated.nutrients, portionGrams);
    const evaluationInput = {
      portionGrams: portionGrams.toString(),
      nutrients: profile,
      targets: targetCalculation.targets,
      targetCalculation,
    };
    const evaluation = this.foodEvaluationService == null
      ? this.engine.evaluateWithKernel(evaluationInput)
      : this.foodEvaluationService.evaluateResolvedComposition(evaluationInput);
    const components = calculated.resolvedIngredients.map(({ component, food, grams: componentGrams }) => ({
      componentId: component.id,
      foodId: component.foodId,
      servingId: component.servingId,
      quantity: component.quantity,
      unit: component.unit,
      portionGrams: componentGrams.toString(),
      evaluation: this.engine.evaluateWithKernel({
        portionGrams: componentGrams.toString(),
        nutrients: this.toNutrients(food),
        targets: targetCalculation.targets,
        targetCalculation,
      }),
    }));

    const canonicalFoods = calculated.resolvedIngredients.map(({ component, food }) => ({
      foodId: food.id,
      servingId: component.servingId,
      servingGrams: component.servingGrams,
      source: food.source ?? 'unknown',
      sourceId: food.sourceId ?? null,
      nutrientFingerprint: this.fingerprint(food.nutrients.map(({ nutrient, amount }) => ({ id: nutrient.id, name: nutrient.name, unit: nutrient.unit, amount }))),
    }));
    const policySetFingerprint = options?.policySetFingerprint ?? this.policyService.getPolicySetFingerprint();
    const recipeFingerprint = this.fingerprint({ recipeVersion: input, resolved: calculated.resolvedIngredients.map(({ component, grams }) => ({ componentId: component.id, foodId: component.foodId, quantity: component.quantity, unit: component.unit, portionGrams: grams.toString() })) });
    const mealAssessment = options?.includeMealAssessment === false
      ? undefined
      : this.mealAssessmentProjection.project({
        contributions: evaluation.contributions,
        compatibilityReasons: evaluation.reasons,
        resolvedRules: targetCalculation.resolvedRules ?? [],
        deferredPolicies: [...targetCalculation.deferredPolicies, ...evaluation.deferredPolicies],
        evaluatorVersion: EVALUATOR_VERSION,
        policySetFingerprint: policySetFingerprint ?? undefined,
        evaluationFingerprint: recipeFingerprint,
      });
    return {
      recipeId: input.recipeId,
      recipeVersionId: input.recipeVersionId,
      recipeVersion: input.recipeVersion,
      portionGrams: portionGrams.toString(),
      evaluation,
      ...(mealAssessment == null ? {} : { mealAssessment }),
      targetCalculation,
      components,
      provenance: {
        evaluatorVersion: EVALUATOR_VERSION,
        policySetFingerprint,
        recipeFingerprint,
        canonicalFoods,
      },
      limitations: [
        'Recipe nutrition is calculated from current canonical Food data and the selected immutable Recipe Version.',
        'Cooking transformations not represented by canonical quantities are not inferred.',
      ],
    };
  }

  private selectVersion(
    versions: readonly RecipeVersionSource[],
    requestedVersion?: number,
    requestedVersionId?: string,
  ): RecipeVersionSource {
    const version = requestedVersionId != null
      ? versions.find((item) => item.id === requestedVersionId)
      : requestedVersion == null
        ? versions[0]
        : versions.find((item) => item.version === requestedVersion);
    if (version == null) throw new RecipeEvaluationValidationError('Requested recipe version is not available.');
    if (version.approvalStatus !== 'APPROVED') throw new RecipeEvaluationValidationError('Only approved recipe versions can be evaluated.');
    return version;
  }

  private toNutrientsPer100Grams(nutrients: readonly { name: string; unit: string; amount: string }[], portionGrams: Decimal): FoodEvaluationNutrientInput[] {
    return nutrients.map(({ name, unit, amount }) => ({
      name,
      unit,
      amountPer100Grams: new Decimal(amount).mul(100).div(portionGrams).toString(),
    }));
  }

  private toNutrients(food: import('../../foods/sources/food-detail.source.js').FoodDetailSource): FoodEvaluationNutrientInput[] {
    return selectAuthoritativeNutrientInputs(food.nutrients.map(({ nutrient, amount }) => ({
      sourceId: nutrient.sourceId,
      name: nutrient.name,
      unit: nutrient.unit,
      amountPer100Grams: amount,
    })));
  }

  private fingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
}
