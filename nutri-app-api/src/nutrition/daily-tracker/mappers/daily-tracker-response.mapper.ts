import {
  DailyNutritionEntryDto,
  DailyNutritionResponseDto,
  DailyNutritionTargetDto,
  DailyNutritionTotalDto,
} from '../dto/daily-tracker-response.dto.js';
import type { DailyNutritionLogSource } from '../types/daily-tracker.source.js';

export class DailyTrackerResponseMapper {
  static toResponseDto(source: DailyNutritionLogSource): DailyNutritionResponseDto {
    const totals: Record<string, DailyNutritionTotalDto> = {};
    for (const [key, value] of Object.entries(source.totals)) totals[key] = { ...value };

    const targets: Record<string, DailyNutritionTargetDto> = {};
    for (const [key, value] of Object.entries(source.targets)) targets[key] = { ...value };

    return {
      date: source.date,
      entries: source.entries.map((entry): DailyNutritionEntryDto => ({
        id: entry.id,
        foodId: entry.foodId,
        servingId: entry.servingId,
        servings: entry.servings,
        foodName: entry.foodName,
        displayName: entry.displayName,
        variantLabel: entry.variantLabel,
        servingName: entry.servingName,
        servingGrams: entry.servingGrams,
        snapshotFoodName: entry.snapshotFoodName,
        snapshotServingName: entry.snapshotServingName,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        ...(entry.recipeId == null ? {} : { recipeId: entry.recipeId, ...(entry.recipeVersionId == null ? {} : { recipeVersionId: entry.recipeVersionId }) }),
      })),
      totals,
      targets,
    };
  }
}
