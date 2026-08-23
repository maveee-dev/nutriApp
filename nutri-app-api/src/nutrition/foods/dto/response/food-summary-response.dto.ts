import { FoodCategoryResponseDto } from "../../../categories/dto/response/food-category-response.dto.js";

export class FoodSummaryResponseDto {
  id!: string;
  name!: string;
  displayName!: string;
  variantLabel!: string | null;
  category!: FoodCategoryResponseDto;
}
