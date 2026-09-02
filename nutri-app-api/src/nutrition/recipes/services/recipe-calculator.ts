import { Injectable, Optional } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { CanonicalCalculationKernel } from '../../calculation/index.js';
import { authoritativeNutrientKey, selectAuthoritativeNutrientInputs } from '../../analysis/services/authoritative-nutrient-input.js';
import { FoodsService } from '../../foods/services/foods.service.js';
import type { FoodDetailSource } from '../../foods/sources/food-detail.source.js';
import { RecipeEvaluationValidationError } from '../errors/recipe-evaluation-validation.error.js';
import type { RecipeVersionSource, RecipeComponentSource } from '../types/recipe.source.js';
import type { RecipeNutritionSource } from '../types/recipe-nutrition.source.js';

export interface ResolvedRecipeIngredient {
  readonly component: RecipeComponentSource;
  readonly food: FoodDetailSource;
  readonly grams: Decimal;
}

/**
 * Composes canonical Food and Serving records into nutrition for one recipe
 * serving. All arithmetic is delegated to the Canonical Calculation Kernel;
 * this class only resolves recipe quantities and yield servings.
 */
@Injectable()
export class RecipeCalculator {
  private readonly kernel: CanonicalCalculationKernel;

  constructor(
    private readonly foodsService: FoodsService,
    @Optional() kernel?: CanonicalCalculationKernel,
  ) {
    this.kernel = kernel ?? new CanonicalCalculationKernel();
  }

  async calculate(recipe: RecipeVersionSource, requestedServings = '1'): Promise<RecipeNutritionSource> {
    const details = await this.calculateWithDetails(recipe, requestedServings);
    return {
      recipeId: details.recipeId,
      recipeVersionId: details.recipeVersionId,
      recipeVersion: details.recipeVersion,
      servings: details.servings,
      servingGrams: details.servingGrams,
      nutrients: details.nutrients,
      ingredients: details.ingredients,
    };
  }

  async calculateWithDetails(recipe: RecipeVersionSource, requestedServings = '1'): Promise<RecipeNutritionSource & { readonly resolvedIngredients: readonly ResolvedRecipeIngredient[] }> {
    const yieldServings = this.positive(recipe.yieldServings, 'Recipe yield must be greater than zero.');
    const servings = this.positive(requestedServings, 'Recipe servings must be greater than zero.');
    const resolved = await Promise.all(recipe.components.map((component) => this.resolve(component)));
    const totalGrams = resolved.reduce((sum, item) => sum.plus(item.grams), new Decimal(0));
    if (!totalGrams.gt(0)) throw new RecipeEvaluationValidationError('Recipe must contain a positive evaluated portion.');

    const composition = this.kernel.calculateComposition({
      items: resolved.map(({ food, grams }) => ({
        servingGrams: grams.toString(),
        nutrients: selectAuthoritativeNutrientInputs(food.nutrients.map(({ nutrient, amount }) => ({
          sourceId: nutrient.sourceId,
          name: nutrient.name,
          unit: nutrient.unit,
          amountPer100Grams: amount,
        }))).map((nutrient) => ({
          nutrientKey: authoritativeNutrientKey(nutrient),
          name: nutrient.name,
          unit: nutrient.unit,
          amountPer100Grams: nutrient.amountPer100Grams,
        })),
      })),
    });

    return {
      recipeId: recipe.recipeId ?? '',
      recipeVersionId: recipe.id,
      recipeVersion: recipe.version,
      servings: yieldServings.toString(),
      servingGrams: totalGrams.div(yieldServings).mul(servings).toString(),
      nutrients: composition.contributions.map((contribution) => ({
        ...contribution,
        amount: new Decimal(contribution.amount).div(yieldServings).mul(servings).toString(),
      })),
      ingredients: resolved.map(({ component, grams }) => ({
        ingredientId: component.id,
        foodId: component.foodId,
        servingId: component.servingId,
        quantity: component.quantity,
        unit: component.unit,
        grams: grams.div(yieldServings).mul(servings).toString(),
      })),
      resolvedIngredients: resolved.map((item) => ({
        ...item,
        grams: item.grams.div(yieldServings).mul(servings),
      })),
    };
  }

  private async resolve(component: RecipeComponentSource): Promise<ResolvedRecipeIngredient> {
    const quantity = this.positive(component.quantity, `Recipe component ${component.id} must have a positive quantity.`);
    const food = await this.foodsService.findDetailById(component.foodId);
    if (component.unit === 'GRAM') return { component, food, grams: quantity };
    if (component.unit !== 'SERVING' || component.servingId == null) {
      throw new RecipeEvaluationValidationError(`Recipe component ${component.id} requires a canonical serving.`);
    }
    const serving = food.servings.find((item) => item.id === component.servingId);
    if (serving == null) throw new RecipeEvaluationValidationError(`Recipe component ${component.id} references a serving that does not belong to its Food.`);
    return {
      component,
      food,
      grams: new Decimal(this.kernel.servingToGrams({ servingGrams: serving.grams, quantity: quantity.toString() })),
    };
  }

  private positive(value: string, message: string): Decimal {
    const decimal = new Decimal(value);
    if (!decimal.isFinite() || !decimal.gt(0)) throw new RecipeEvaluationValidationError(message);
    return decimal;
  }
}
