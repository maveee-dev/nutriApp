import { DailyNutritionResponseDto, WeeklyNutritionResponseDto } from '../../dto/daily-nutrition-response.dto.js';
import { DailyNutritionSummarySource, WeeklyNutritionSummarySource } from '../../types/daily-nutrition-summary.source.js';

export class DailyNutritionResponseMapper {
  static toResponseDto(
    source: DailyNutritionSummarySource,
  ): DailyNutritionResponseDto {
    return {
      date: source.date,
      mealCount: source.mealCount,
      totals: source.totals.map((total) => ({
        name: total.name,
        unit: total.unit,
        amount: total.amount,
      })),
      targets: { ...source.targets },
      insights: source.insights.map((insight) => ({ ...insight })),
      deferredPolicies: source.deferredPolicies.map((policy) => ({ ...policy })),
    };
  }

  static toWeeklyResponseDto(source: WeeklyNutritionSummarySource): WeeklyNutritionResponseDto {
    return {
      startDate: source.startDate,
      endDate: source.endDate,
      days: source.days.map((day) => this.toResponseDto(day)),
    };
  }
}
