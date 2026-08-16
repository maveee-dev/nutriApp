import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { DailyNutritionQueryDto } from '../dto/daily-nutrition-query.dto.js';
import { DailyNutritionResponseDto, WeeklyNutritionResponseDto } from '../dto/daily-nutrition-response.dto.js';
import { WeeklyNutritionQueryDto } from '../dto/weekly-nutrition-query.dto.js';
import { DailyNutritionResponseMapper } from '../mappers/controller/daily-nutrition-response.mapper.js';
import { NutritionAnalysisService } from '../services/nutrition-analysis.service.js';

@Controller('nutrition')
@UseGuards(JwtAuthGuard)
export class NutritionAnalysisController {
  constructor(private readonly service: NutritionAnalysisService) {}

  @Get('daily')
  async getDaily(
    @CurrentUser() user: JwtPayload,
    @Query() query: DailyNutritionQueryDto,
  ): Promise<DailyNutritionResponseDto> {
    const summary = await this.service.getDailySummary(user.sub, query.date);
    return DailyNutritionResponseMapper.toResponseDto(summary);
  }

  @Get('weekly')
  async getWeekly(
    @CurrentUser() user: JwtPayload,
    @Query() query: WeeklyNutritionQueryDto,
  ): Promise<WeeklyNutritionResponseDto> {
    const summary = await this.service.getWeeklySummary(user.sub, query.startDate);
    return DailyNutritionResponseMapper.toWeeklyResponseDto(summary);
  }
}
