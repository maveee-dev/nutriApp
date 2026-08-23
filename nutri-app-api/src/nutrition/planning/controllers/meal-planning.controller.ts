import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { DailyMealPlanQueryDto } from '../dto/daily-meal-plan-query.dto.js';
import { DailyMealPlanResponseDto, MealPlanMealDto } from '../dto/daily-meal-plan-response.dto.js';
import { MealPlanningService } from '../services/meal-planning.service.js';
import { CustomizeMealPlanDto } from '../dto/customize-meal-plan.dto.js';

@Controller('nutrition/meal-plans')
@UseGuards(JwtAuthGuard)
export class MealPlanningController {
  constructor(private readonly service: MealPlanningService) {}

  @Get('daily')
  generateDaily(@CurrentUser() user: JwtPayload, @Query() query: DailyMealPlanQueryDto): Promise<DailyMealPlanResponseDto> {
    return this.service.generate(user.sub, query.date);
  }

  @Post('customize')
  customize(@CurrentUser() user: JwtPayload, @Body() dto: CustomizeMealPlanDto): Promise<MealPlanMealDto> {
    return this.service.customize(user.sub, dto);
  }
}
