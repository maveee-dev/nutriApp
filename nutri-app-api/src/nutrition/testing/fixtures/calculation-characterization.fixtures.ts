import { Decimal } from 'decimal.js';
import type { NutritionAnalysisItemSource } from '../../analysis/sources/nutrition-analysis.source.js';
import type { NutritionTargetCalculation } from '../../analysis/types/nutrition-targets.type.js';
import type { FoodEvaluationNutrientInput } from '../../evaluation/types/food-evaluation.type.js';
import type { FoodDetailSource } from '../../foods/sources/food-detail.source.js';
import type { RecipeVersionSource } from '../../recipes/types/recipe.source.js';

/**
 * Stable, source-independent nutrient values used to characterize the current
 * calculation behavior. These are test values, not clinical or USDA data.
 */
export const CHARACTERIZATION_NUTRIENTS = [
  { name: 'Calories', unit: 'kcal', amountPer100Grams: '100' },
  { name: 'Protein', unit: 'g', amountPer100Grams: '10' },
  { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '20' },
  { name: 'Fat', unit: 'g', amountPer100Grams: '5' },
  { name: 'Fatty acids, total saturated', unit: 'g', amountPer100Grams: '1.2' },
  { name: 'Fiber, total dietary', unit: 'g', amountPer100Grams: '3' },
  { name: 'Sugars, total including NLEA', unit: 'g', amountPer100Grams: '6' },
  { name: 'Sugars, added', unit: 'g', amountPer100Grams: '2' },
  { name: 'Sodium, Na', unit: 'mg', amountPer100Grams: '120' },
  { name: 'Potassium, K', unit: 'mg', amountPer100Grams: '250' },
  { name: 'Phosphorus, P', unit: 'mg', amountPer100Grams: '100' },
  { name: 'Cholesterol', unit: 'mg', amountPer100Grams: '40' },
  { name: 'Calcium, Ca', unit: 'mg', amountPer100Grams: '60' },
  { name: 'Iron, Fe', unit: 'mg', amountPer100Grams: '2' },
] as const;

export type CharacterizationNutrient = (typeof CHARACTERIZATION_NUTRIENTS)[number];

export const CHARACTERIZATION_TARGETS = {
  sodiumMilligrams: '2300',
  proteinGrams: '64',
  saturatedFatGrams: '20',
  addedSugarGrams: '50',
  cholesterolMilligrams: '300',
  fiberGrams: '28',
  carbohydrateGrams: '180',
  potassiumMilligrams: '2000',
  phosphorusMilligrams: '800',
  caloriesKcal: '2000',
};

export const CHARACTERIZATION_TARGET_CALCULATION: NutritionTargetCalculation = {
  targets: CHARACTERIZATION_TARGETS,
  adjustments: [],
  deferredPolicies: [],
  targetProvenance: [],
};

export function characterizationItem(
  quantity = '1',
  servingGrams = '100',
  nutrients: readonly CharacterizationNutrient[] = CHARACTERIZATION_NUTRIENTS,
): NutritionAnalysisItemSource {
  return { quantity, servingGrams, nutrients };
}

export function characterizationEvaluationNutrients(
  nutrients: readonly CharacterizationNutrient[] = CHARACTERIZATION_NUTRIENTS,
): readonly FoodEvaluationNutrientInput[] {
  return nutrients.map(({ name, unit, amountPer100Grams }) => ({ name, unit, amountPer100Grams }));
}

export function expectedCharacterizationTotals(scale: string): readonly { name: string; unit: string; amount: string }[] {
  return CHARACTERIZATION_NUTRIENTS.map(({ name, unit, amountPer100Grams }) => ({
    name,
    unit,
    amount: new Decimal(amountPer100Grams).mul(scale).toString(),
  })).sort((left, right) => left.name.localeCompare(right.name));
}

export function characterizationFood(
  id: string,
  name: string,
  nutrients: readonly CharacterizationNutrient[] = CHARACTERIZATION_NUTRIENTS,
  servingGrams = '100',
): FoodDetailSource {
  return {
    id,
    source: 'TEST',
    sourceId: id,
    name,
    category: { id: 'characterization-category', name: 'Characterization', description: null },
    planningClass: 'MEAL_ELIGIBLE',
    servings: [{ id: `${id}-serving`, name: '1 test serving', grams: servingGrams }],
    nutrients: nutrients.map((nutrient, index) => ({
      nutrient: { id: `${id}-nutrient-${index}`, name: nutrient.name, unit: nutrient.unit, description: null },
      amount: nutrient.amountPer100Grams,
    })),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

export function characterizationRecipeVersion(): RecipeVersionSource {
  return {
    id: 'characterization-recipe-version-1',
    recipeId: 'characterization-recipe',
    version: 1,
    name: 'Characterization Bowl',
    description: null,
    cuisine: 'Test',
    mealTypes: ['LUNCH'],
    yieldServings: '2',
    sourceType: 'OFFICIAL',
    sourceName: 'Characterization fixture',
    sourceUrl: null,
    sourceReference: null,
    sourceVersion: '1',
    approvalStatus: 'APPROVED',
    approvedAt: new Date('2026-01-01T00:00:00.000Z'),
    approvedByUserId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    components: [
      {
        id: 'characterization-component-1',
        foodId: 'characterization-food-a',
        foodName: 'Characterization Food A',
        servingId: 'characterization-food-a-serving',
        servingName: '1 test serving',
        servingGrams: '100',
        role: 'MAIN_DISH',
        quantity: '1',
        unit: 'SERVING',
        displayOrder: 0,
        notes: null,
      },
      {
        id: 'characterization-component-2',
        foodId: 'characterization-food-b',
        foodName: 'Characterization Food B',
        servingId: 'characterization-food-b-serving',
        servingName: '1 test serving',
        servingGrams: '50',
        role: 'STAPLE',
        quantity: '2',
        unit: 'SERVING',
        displayOrder: 1,
        notes: null,
      },
    ],
  };
}
