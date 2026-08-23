import { FoodCategoryResponseDto } from "../../../categories/dto/response/food-category-response.dto.js";
import { FoodNutrientResponseDto } from "../../../nutrients/dto/response/food-nutrient-response.dto.js";
import { ServingResponseDto } from "../../../servings/dto/response/serving-response-dto.js";

export class FoodDetailResponseDto {
  id!: string;
  name!: string;
  displayName!: string;
  variantLabel!: string | null;
  category!: FoodCategoryResponseDto;
  servings!: readonly ServingResponseDto[];
  nutrients!: readonly FoodNutrientResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
