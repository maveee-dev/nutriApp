import {
  HealthDashboardCompatibilitySummaryDto,
  HealthDashboardDailyFoodDto,
  HealthDashboardInsightDto,
  HealthDashboardLaboratoryResultDto,
  HealthDashboardLaboratorySummaryDto,
  HealthDashboardLaboratoryTrendDto,
  HealthDashboardMealPlannerDto,
  HealthDashboardNutritionInsightDto,
  HealthDashboardNutrientProgressDto,
  HealthDashboardRecommendedFoodDto,
  HealthDashboardResponseDto,
  HealthDashboardRecipeCardDto,
  HealthDashboardRecipeSummaryDto,
} from '../dto/health-dashboard-response.dto.js';
import type { HealthDashboardRecipeCardSource, HealthDashboardSource } from '../types/health-dashboard.source.js';
import type { LaboratoryResultAnalysisSource } from '../../laboratory/sources/laboratory-analysis.source.js';

export class HealthDashboardResponseMapper {
  static toDto(source: HealthDashboardSource): HealthDashboardResponseDto {
    return {
      greeting: {
        greeting: source.greeting.greeting,
        displayName: source.greeting.displayName,
        date: source.greeting.date,
        profileSummary: {
          conditions: [...source.greeting.profileSummary.conditions],
          dialysis: source.greeting.profileSummary.dialysis,
        },
      },
      nutritionProgress: source.nutritionProgress.map((item): HealthDashboardNutrientProgressDto => ({ ...item })),
      nutritionInsights: source.nutritionInsights.map((insight): HealthDashboardNutritionInsightDto => ({ ...insight })),
      laboratorySummary: this.laboratory(source),
      mealPlanner: this.planner(source),
      dailyFoods: source.dailyFoods.map((food): HealthDashboardDailyFoodDto => ({ ...food })),
      compatibilitySummary: { ...source.compatibilitySummary } satisfies HealthDashboardCompatibilitySummaryDto,
      healthNotices: source.healthNotices.map((notice): HealthDashboardInsightDto => ({ ...notice })),
      ...(source.recipeSummary == null ? {} : { recipeSummary: this.recipes(source) }),
    };
  }

  private static recipes(source: HealthDashboardSource): HealthDashboardRecipeSummaryDto {
    const map = (items: readonly HealthDashboardRecipeCardSource[]): HealthDashboardRecipeCardDto[] => items.map((recipe) => ({
      recipeId: recipe.recipeId,
      recipeVersionId: recipe.recipeVersionId,
      name: recipe.name,
      isFavorite: recipe.isFavorite,
      updatedAt: recipe.updatedAt.toISOString(),
      compatibilityScore: recipe.compatibilityScore,
      coverage: recipe.coverage,
    }));
    return {
      recent: map(source.recipeSummary!.recent),
      favorites: map(source.recipeSummary!.favorites),
      today: map(source.recipeSummary!.today),
      recentEvaluated: map(source.recipeSummary!.recentEvaluated),
    };
  }

  private static laboratory(source: HealthDashboardSource): HealthDashboardLaboratorySummaryDto {
    const latest = source.laboratorySummary.latestReport;
    return {
      latestReport: latest == null ? null : {
        id: latest.id,
        reportDate: latest.reportDate.toISOString().slice(0, 10),
        source: latest.source,
        createdAt: latest.createdAt.toISOString(),
      },
      results: latest?.results.map((result): HealthDashboardLaboratoryResultDto => this.result(result)) ?? [],
      importantResults: source.laboratorySummary.importantResults.map((result): HealthDashboardLaboratoryResultDto => this.result(result)),
      trends: source.laboratorySummary.trends.map((trend): HealthDashboardLaboratoryTrendDto => ({
        testCode: trend.testCode,
        testName: trend.testName,
        direction: trend.direction,
        latest: { ...trend.latest, reportDate: trend.latest.reportDate.toISOString().slice(0, 10) },
        previous: trend.previous == null ? null : { ...trend.previous, reportDate: trend.previous.reportDate.toISOString().slice(0, 10) },
        points: trend.points.map((point) => ({ ...point, reportDate: point.reportDate.toISOString().slice(0, 10) })),
      })),
      insights: source.laboratorySummary.insights.map((insight): HealthDashboardInsightDto => ({
        category: insight.category,
        severity: insight.severity,
        title: insight.title,
        message: insight.message,
        source: 'laboratory',
      })),
    };
  }

  private static result(result: LaboratoryResultAnalysisSource): HealthDashboardLaboratoryResultDto {
    return {
      id: result.id,
      reportId: result.reportId,
      testCode: result.testCode,
      testName: result.testName,
      value: result.value,
      unit: result.unit,
      referenceLow: result.referenceLow,
      referenceHigh: result.referenceHigh,
      flag: result.flag,
      status: result.status,
      message: result.message,
      reportDate: result.reportDate.toISOString().slice(0, 10),
    };
  }

  private static planner(source: HealthDashboardSource): HealthDashboardMealPlannerDto {
    const recommendation = source.mealPlanner.recommendation;
    return {
      remainingMeals: source.mealPlanner.remainingMeals,
      recommendation: recommendation == null ? null : {
        date: recommendation.date,
        mealType: recommendation.mealType,
        focus: recommendation.focus,
        foods: recommendation.foods.map((food): HealthDashboardRecommendedFoodDto => ({
          foodId: food.foodId,
          displayName: food.displayName,
          variantLabel: food.variantLabel,
          servingId: food.servingId,
          servingName: food.servingName,
          servingGrams: food.servingGrams,
          quantity: food.quantity,
          score: food.score,
          coverage: food.coverage,
          evaluationStatus: food.evaluationStatus,
          keyNutrients: food.keyNutrients.map((nutrient) => ({ ...nutrient })),
        })),
        summary: Object.fromEntries(Object.entries(recommendation.summary).map(([key, value]) => [key, { ...value }])),
        remainingBudget: Object.fromEntries(Object.entries(recommendation.remainingBudget).map(([key, value]) => [key, { ...value }])),
        limitations: [...recommendation.limitations],
      },
    };
  }
}
