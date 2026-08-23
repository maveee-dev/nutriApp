import { FoodCategoryResponseMapper } from '../../../categories/mappers/controller/food-category-response.mapper.js';
import { NutrientResponseMapper } from '../../../nutrients/mappers/controller/nutrient-response.mapper.js';
import { ServingResponseMapper } from '../../../servings/mappers/controller/serving-response.mapper.js';
import { FoodDetailResponseDto } from '../../dto/response/food-detail-response.dto.js';
import { FoodSummaryResponseDto } from '../../dto/response/food-summary-response.dto.js';
import { FoodDetailSource } from '../../sources/food-detail.source.js';
import { FoodSummarySource } from '../../sources/food-summary.source.js';

export class FoodResponseMapper {
  static toFoodDetailDto(source: FoodDetailSource): FoodDetailResponseDto {
    return {
      id: source.id,
      name: source.name,
      displayName: source.displayName ?? source.name,
      variantLabel: source.variantLabel ?? null,
      category: FoodCategoryResponseMapper.toFoodCategoryDto(source.category),
      servings: source.servings.map(ServingResponseMapper.toServingDto),
      nutrients: source.nutrients.map(NutrientResponseMapper.toFoodNutrientDto),
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }

  static toFoodSummaryDto(source: FoodSummarySource): FoodSummaryResponseDto {
    return {
      id: source.id,
      name: source.name,
      displayName: source.displayName ?? source.name,
      variantLabel: source.variantLabel ?? null,
      category: source.category,
    };
  }
}
