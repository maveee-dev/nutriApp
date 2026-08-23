import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { UuidParamDto } from '../../../common/dto/request/uuid-param.dto.js';
import { MealEvaluationSnapshotRepository } from '../../../meals/repositories/meal-evaluation-snapshot.repository.js';
import { RecommendationService } from '../recommendation.service.js';
import { RecommendationResponseMapper } from '../mappers/recommendation-response.mapper.js';
import { RecommendationResolutionResponseDto, CurrentMealRecommendationsResponseDto } from '../dto/recommendation-response.dto.js';
import { NutritionAnalysisService } from '../../analysis/services/nutrition-analysis.service.js';
import { DailyNutritionQueryDto } from '../../analysis/dto/daily-nutrition-query.dto.js';
import { WeeklyNutritionQueryDto } from '../../analysis/dto/weekly-nutrition-query.dto.js';

@Controller('nutrition/recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationService: RecommendationService, private readonly snapshotRepository: MealEvaluationSnapshotRepository, private readonly analysisService: NutritionAnalysisService) {}

  @Get('current-food/:id')
  async currentFood(@CurrentUser() user: JwtPayload, @Param() param: UuidParamDto): Promise<RecommendationResolutionResponseDto> {
    const snapshot = await this.snapshotRepository.findByIdForUser(param.id, user.sub);
    if (snapshot == null) throw new NotFoundException('Evaluation snapshot not found.');
    return RecommendationResponseMapper.toCurrentFoodResponse(snapshot, this.recommendationService.recommend(user.sub, snapshot, 'current-food'));
  }

  @Get('current-meal/:id')
  async currentMeal(@CurrentUser() user: JwtPayload, @Param() param: UuidParamDto): Promise<CurrentMealRecommendationsResponseDto> {
    const snapshots = await this.snapshotRepository.findLatestForMealForUser(param.id, user.sub);
    if (snapshots.length === 0) throw new NotFoundException('Meal evaluation snapshots not found.');
    return RecommendationResponseMapper.toCurrentMealResponse(param.id, snapshots.map((snapshot) => ({ snapshot, resolution: this.recommendationService.recommend(user.sub, snapshot, 'current-meal') })));
  }

  @Get('daily')
  async daily(@CurrentUser() user: JwtPayload, @Query() query: DailyNutritionQueryDto): Promise<RecommendationResolutionResponseDto> {
    const summary = await this.analysisService.getDailySummary(user.sub, query.date);
    return RecommendationResponseMapper.toDailyResponse(user.sub, query.date, this.recommendationService.recommendDaily(user.sub, summary));
  }

  @Get('historical')
  async historical(@CurrentUser() user: JwtPayload, @Query() query: WeeklyNutritionQueryDto): Promise<RecommendationResolutionResponseDto> {
    const summary = await this.analysisService.getHistoricalSummary(user.sub, query.startDate);
    return RecommendationResponseMapper.toHistoricalResponse(user.sub, summary.startDate, summary.endDate, this.recommendationService.recommendHistorical(user.sub, summary.days));
  }

  @Get('weekly')
  async weekly(@CurrentUser() user: JwtPayload, @Query() query: WeeklyNutritionQueryDto): Promise<RecommendationResolutionResponseDto> {
    const summary = await this.analysisService.getWeeklySummary(user.sub, query.startDate);
    return RecommendationResponseMapper.toWeeklyResponse(user.sub, summary.startDate, summary.endDate, this.recommendationService.recommendWeekly(user.sub, summary.days, summary.startDate, summary.endDate));
  }
}
