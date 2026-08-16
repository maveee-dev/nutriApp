import { FoodNutrientResponseDto } from '../../dto/response/food-nutrient-response.dto.js';
import { NutrientResponseDto } from '../../dto/response/nutrient-response.dto.js';
import { FoodNutrientSource } from '../../sources/food-nutrient.source.js';
import { NutrientSource } from '../../sources/nutrient.source.js';

export class NutrientResponseMapper {
  static ToNutrientDto(source: NutrientSource): NutrientResponseDto {
    return {
      id: source.id,
      name: source.name,
      unit: source.unit,
      description: source.description,
    };
  }

  static toFoodNutrientDto(
    source: FoodNutrientSource,
  ): FoodNutrientResponseDto {
    return {
      nutrient: this.ToNutrientDto(source.nutrient),
      amount: source.amount,
    };
  }
}
