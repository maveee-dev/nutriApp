import { CursorPaginatedResponseDto } from "../../../common/pagination/cursor/dto/cursor-paginated-response.dto.js";
import { PaginatedResponseSource } from "../../../common/pagination/offset/types/paginated-response-source.type.js";
import { MealDetailResponseDto } from "../../dto/response/meal-detail-response.dto.js";
import { MealSummaryResponseDto } from "../../dto/response/meal-summary-response.dto.js";
import { MealDetailSource } from "../../sources/meal-detail.source.js";
import { MealSummarySource } from "../../sources/meal-summary.source.js";
import { MealItemMapper } from "./meal-item.mapper.js";

export class MealResponseMapper {
  static toMealSummaryResponseDto(
    source: MealSummarySource,
  ): MealSummaryResponseDto {
    return {
      id: source.id,
      mealType: source.mealType,
      consumedAt: source.consumedAt,
      itemCount: source.itemCount,
    };
  }

  static toMealDetailResponseDto(
    source: MealDetailSource,
  ): MealDetailResponseDto {
    return {
      id: source.id,
      mealType: source.mealType,
      consumedAt: source.consumedAt,
      items: source.items.map(MealItemMapper.toResponseDto),
    };
  }
}
