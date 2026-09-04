import { FoodCategoryResponseDto } from "../../../categories/dto/response/food-category-response.dto.js";

export class FoodSummaryResponseDto {
  id!: string;
  name!: string;
  displayName!: string;
  /** Optional catalog context for user-facing pickers. */
  description?: string | null;
  variantLabel!: string | null;
  category!: FoodCategoryResponseDto;
}
