import type { DailyNutritionEntrySource, DailyNutritionLogSource } from '../types/daily-tracker.source.js';
import { resolveFoodPresentation } from '../../foods/services/food-presentation.service.js';
import type { DailyNutritionEntryRow, DailyNutritionLogRow, DailyNutritionServingRow } from '../repositories/daily-tracker.prisma.js';
import type { RecipeVersionSource } from '../../recipes/types/recipe.source.js';

export class DailyTrackerRepositoryMapper {
  static toEntrySource(row: DailyNutritionEntryRow): DailyNutritionEntrySource {
    if (row.food == null || row.serving == null) {
      const recipeVersion = row.recipeVersion == null ? undefined : DailyTrackerRepositoryMapper.toRecipeVersionSource(row.recipeVersion, row.recipeId ?? '');
      return {
        id: row.id,
        date: row.dailyLog.date.toISOString().slice(0, 10),
        foodId: null,
        servingId: null,
        recipeId: row.recipeId,
        recipeVersionId: row.recipeVersionId,
        servings: row.servings.toString(),
        snapshotFoodName: row.snapshotFoodName,
        snapshotServingName: row.snapshotServingName,
        foodName: recipeVersion?.name ?? row.snapshotFoodName,
        displayName: recipeVersion?.name ?? row.snapshotFoodName,
        variantLabel: null,
        servingName: `1 serving (${recipeVersion?.yieldServings ?? '1'} total servings)`,
        servingGrams: '0',
        nutrients: [],
        ...(recipeVersion == null ? {} : { recipeVersion }),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }
    const presentation = resolveFoodPresentation(row.food.name, row.food.presentation == null ? null : {
      displayNameOverride: row.food.presentation.displayNameOverride,
      variantLabelOverride: row.food.presentation.variantLabelOverride,
      searchPriority: row.food.presentation.searchPriority,
      aliases: row.food.presentation.aliases,
    });
    return {
      id: row.id,
      date: row.dailyLog.date.toISOString().slice(0, 10),
      foodId: row.foodId,
      servingId: row.servingId,
      recipeId: row.recipeId,
      recipeVersionId: row.recipeVersionId,
      servings: row.servings.toString(),
      snapshotFoodName: row.snapshotFoodName,
      snapshotServingName: row.snapshotServingName,
      foodName: row.food.name,
      displayName: presentation.displayName,
      variantLabel: presentation.variantLabel,
      servingName: row.serving.name,
      servingGrams: row.serving.grams.toString(),
      nutrients: row.food.nutrients.map((foodNutrient) => ({
        sourceId: foodNutrient.nutrient.sourceId,
        name: foodNutrient.nutrient.name,
        unit: foodNutrient.nutrient.unit,
        amountPer100Grams: foodNutrient.amount.toString(),
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toRecipeVersionSource(row: NonNullable<DailyNutritionEntryRow['recipeVersion']>, recipeId: string): RecipeVersionSource {
    return {
      id: row.id,
      recipeId,
      version: row.version,
      name: row.name,
      description: row.description,
      preparationInstructions: row.preparationInstructions,
      cuisine: row.cuisine,
      mealTypes: row.mealTypes,
      yieldServings: row.yieldServings.toString(),
      sourceType: row.sourceType,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      sourceReference: row.sourceReference,
      sourceVersion: row.sourceVersion,
      approvalStatus: row.approvalStatus,
      approvedAt: row.approvedAt,
      approvedByUserId: row.approvedByUserId,
      createdAt: row.createdAt,
      components: row.components.map((component) => ({
        id: component.id,
        foodId: component.foodId,
        foodName: component.food.name,
        servingId: component.servingId,
        servingName: component.serving?.name ?? null,
        servingGrams: component.serving?.grams.toString() ?? null,
        role: component.role,
        quantity: component.quantity.toString(),
        unit: component.unit,
        displayOrder: component.displayOrder,
        notes: component.notes,
      })),
    };
  }

  static toLogSource(row: DailyNutritionLogRow): DailyNutritionLogSource {
    return {
      date: row.date.toISOString().slice(0, 10),
      entries: row.entries.map(DailyTrackerRepositoryMapper.toEntrySource),
      totals: {},
      targets: {},
    };
  }

  static toServingEntrySource(row: DailyNutritionServingRow): Pick<DailyNutritionEntrySource, 'foodName' | 'displayName' | 'variantLabel' | 'servingName' | 'servingGrams' | 'nutrients'> {
    const presentation = resolveFoodPresentation(row.food.name, row.food.presentation == null ? null : {
      displayNameOverride: row.food.presentation.displayNameOverride,
      variantLabelOverride: row.food.presentation.variantLabelOverride,
      searchPriority: row.food.presentation.searchPriority,
      aliases: row.food.presentation.aliases,
    });
    return {
      foodName: row.food.name,
      displayName: presentation.displayName,
      variantLabel: presentation.variantLabel,
      servingName: row.name,
      servingGrams: row.grams.toString(),
      nutrients: row.food.nutrients.map((foodNutrient) => ({
        sourceId: foodNutrient.nutrient.sourceId,
        name: foodNutrient.nutrient.name,
        unit: foodNutrient.nutrient.unit,
        amountPer100Grams: foodNutrient.amount.toString(),
      })),
    };
  }
}
