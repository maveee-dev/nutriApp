import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { CanonicalCalculationKernel } from '../../calculation/index.js';
import { FoodsService } from '../../foods/services/foods.service.js';
import type { FoodDetailSource } from '../../foods/sources/food-detail.source.js';
import { NutritionPolicyService } from '../../analysis/services/nutrition-policy.service.js';
import { FoodEvaluationEngine } from '../../evaluation/services/food-evaluation.engine.js';
import type { FoodEvaluationNutrientInput } from '../../evaluation/types/food-evaluation.type.js';
import { RecipeEvaluationValidationError } from '../errors/recipe-evaluation-validation.error.js';
import { RecipesService } from './recipes.service.js';
import type { RecipeComponentSource, RecipeVersionSource } from '../types/recipe.source.js';
import type { RecipeEvaluationSource } from '../types/recipe-evaluation.source.js';
import { MealAssessmentProjection } from '../../analysis/services/meal-assessment.projection.js';

const EVALUATOR_VERSION = 'food-evaluation-v3';

export interface RecipeEvaluationOptions {
  readonly targetCalculation?: import('../../analysis/types/nutrition-targets.type.js').NutritionTargetCalculation;
  readonly policySetFingerprint?: string | null;
  /** Historical replay can omit a current Meal Assessment when no stored projection exists. */
  readonly includeMealAssessment?: boolean;
}

interface ResolvedComponent {
  readonly component: RecipeComponentSource;
  readonly food: FoodDetailSource;
  readonly portionGrams: Decimal;
}

@Injectable()
export class RecipeEvaluationService {
  private readonly calculationKernel = new CanonicalCalculationKernel();
  private readonly mealAssessmentProjection = new MealAssessmentProjection();

  constructor(
    private readonly recipesService: RecipesService,
    private readonly foodsService: FoodsService,
    private readonly policyService: NutritionPolicyService,
    private readonly engine: FoodEvaluationEngine,
  ) {}

  async evaluate(userId: string, recipeId: string, requestedVersion?: number): Promise<RecipeEvaluationSource> {
    const recipe = await this.recipesService.findById(userId, recipeId);
    const version = this.selectVersion(recipe.versions, requestedVersion);
    return this.evaluateComposition(userId, {
      recipeId,
      recipeVersionId: version.id,
      recipeVersion: version.version,
      yieldServings: version.yieldServings,
      components: version.components,
    });
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
  ): Promise<RecipeEvaluationSource> {
    const targetCalculation = options?.targetCalculation ?? this.policyService.calculateFromContext(await this.policyService.loadContext(userId, 'maintenance'));
    const resolved = await Promise.all(input.components.map((component) => this.resolveComponent(component)));
    const yieldServings = new Decimal(input.yieldServings);
    if (!yieldServings.gt(0)) throw new RecipeEvaluationValidationError('Recipe yield must be greater than zero.');

    const portionGrams = resolved.reduce((sum, item) => sum.plus(item.portionGrams), new Decimal(0)).div(yieldServings);
    if (!portionGrams.gt(0)) throw new RecipeEvaluationValidationError('Recipe must contain a positive evaluated portion.');

    const profile = this.calculateNutrientProfile(resolved, yieldServings, portionGrams);
    const evaluation = this.engine.evaluateWithKernel({
      portionGrams: portionGrams.toString(),
      nutrients: profile,
      targets: targetCalculation.targets,
      targetCalculation,
    });
    const components = resolved.map(({ component, food, portionGrams: componentGrams }) => ({
      componentId: component.id,
      foodId: component.foodId,
      servingId: component.servingId,
      quantity: component.quantity,
      unit: component.unit,
      portionGrams: componentGrams.div(yieldServings).toString(),
      evaluation: this.engine.evaluateWithKernel({
        portionGrams: componentGrams.div(yieldServings).toString(),
        nutrients: this.toNutrients(food),
        targets: targetCalculation.targets,
        targetCalculation,
      }),
    }));

    const canonicalFoods = resolved.map(({ component, food }) => ({
      foodId: food.id,
      servingId: component.servingId,
      servingGrams: component.servingGrams,
      source: food.source ?? 'unknown',
      sourceId: food.sourceId ?? null,
      nutrientFingerprint: this.fingerprint(food.nutrients.map(({ nutrient, amount }) => ({ id: nutrient.id, name: nutrient.name, unit: nutrient.unit, amount }))),
    }));
    const policySetFingerprint = options?.policySetFingerprint ?? this.policyService.getPolicySetFingerprint();
    const recipeFingerprint = this.fingerprint({ recipeVersion: input, resolved: resolved.map(({ component, portionGrams: grams }) => ({ componentId: component.id, foodId: component.foodId, quantity: component.quantity, unit: component.unit, portionGrams: grams.toString() })) });
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

  private selectVersion(versions: readonly RecipeVersionSource[], requestedVersion?: number): RecipeVersionSource {
    const version = requestedVersion == null ? versions[0] : versions.find((item) => item.version === requestedVersion);
    if (version == null) throw new RecipeEvaluationValidationError('Requested recipe version is not available.');
    if (version.approvalStatus !== 'APPROVED') throw new RecipeEvaluationValidationError('Only approved recipe versions can be evaluated.');
    return version;
  }

  private async resolveComponent(component: RecipeComponentSource): Promise<ResolvedComponent> {
    const food = await this.foodsService.findDetailById(component.foodId);
    const quantity = new Decimal(component.quantity);
    if (!quantity.gt(0)) throw new RecipeEvaluationValidationError(`Recipe component ${component.id} must have a positive quantity.`);
    if (component.unit === 'GRAM') return { component, food, portionGrams: quantity };
    if (component.unit !== 'SERVING' || component.servingId == null) throw new RecipeEvaluationValidationError(`Recipe component ${component.id} requires a canonical serving.`);
    const serving = food.servings.find((item) => item.id === component.servingId);
    if (serving == null) throw new RecipeEvaluationValidationError(`Recipe component ${component.id} references a serving that does not belong to its Food.`);
    return {
      component,
      food,
      portionGrams: new Decimal(this.calculationKernel.servingToGrams({
        servingGrams: serving.grams,
        quantity: component.quantity,
      })),
    };
  }

  private calculateNutrientProfile(
    resolved: readonly ResolvedComponent[],
    yieldServings: Decimal,
    portionGrams: Decimal,
  ): FoodEvaluationNutrientInput[] {
    const result = this.calculationKernel.calculateComposition({
      items: resolved.map(({ food, portionGrams: grams }) => ({
        servingGrams: grams.toString(),
        nutrients: food.nutrients.map(({ nutrient, amount }) => ({
          nutrientKey: nutrient.name.trim().toLowerCase(),
          name: nutrient.name,
          unit: nutrient.unit,
          amountPer100Grams: amount,
        })),
      })),
    });

    return result.contributions.map(({ name, unit, amount }) => ({
      name,
      unit,
      amountPer100Grams: new Decimal(amount)
        .div(yieldServings)
        .mul(100)
        .div(portionGrams)
        .toString(),
    }));
  }

  private toNutrients(food: FoodDetailSource): FoodEvaluationNutrientInput[] {
    return food.nutrients.map(({ nutrient, amount }) => ({ name: nutrient.name, unit: nutrient.unit, amountPer100Grams: amount }));
  }

  private fingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
}
