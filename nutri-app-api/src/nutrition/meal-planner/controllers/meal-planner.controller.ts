import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { MealPlannerRequestDto } from '../dto/meal-planner-request.dto.js';
import { MealPlannerResponseDto } from '../dto/meal-planner-response.dto.js';
import { MealPlannerResponseMapper } from '../mappers/meal-planner-response.mapper.js';
import { MealPlannerService } from '../services/meal-planner.service.js';

@Controller('meal-planner')
@UseGuards(JwtAuthGuard)
export class MealPlannerController {
  constructor(private readonly service: MealPlannerService) {}

  @Get('remaining-budget')
  async remainingBudget(@CurrentUser() user: JwtPayload, @Query() query: MealPlannerRequestDto) {
    return this.service.getRemainingBudget(user.sub, query.date);
  }

  @Get('recommendations')
  async recommendations(@CurrentUser() user: JwtPayload, @Query() query: MealPlannerRequestDto): Promise<MealPlannerResponseDto> {
    return MealPlannerResponseMapper.toResponseDto(await this.service.recommend(user.sub, query));
  }

  @Post('recommend')
  async recommend(@CurrentUser() user: JwtPayload, @Body() body: MealPlannerRequestDto): Promise<MealPlannerResponseDto> {
    return MealPlannerResponseMapper.toResponseDto(await this.service.recommend(user.sub, body));
  }
}
