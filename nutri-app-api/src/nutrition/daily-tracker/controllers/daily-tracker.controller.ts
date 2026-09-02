import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { CreateDailyNutritionEntryDto } from '../dto/create-daily-nutrition-entry.dto.js';
import { DailyNutritionResponseDto } from '../dto/daily-tracker-response.dto.js';
import { UpdateDailyNutritionEntryDto } from '../dto/update-daily-nutrition-entry.dto.js';
import { DailyTrackerResponseMapper } from '../mappers/daily-tracker-response.mapper.js';
import { DailyTrackerService } from '../services/daily-tracker.service.js';

@Controller('daily-tracker')
@UseGuards(JwtAuthGuard)
export class DailyTrackerController {
  constructor(private readonly service: DailyTrackerService) {}

  @Get('today')
  async today(@CurrentUser() user: JwtPayload): Promise<DailyNutritionResponseDto> {
    return DailyTrackerResponseMapper.toResponseDto(await this.service.getToday(user.sub));
  }

  @Get(':date')
  async byDate(@CurrentUser() user: JwtPayload, @Param('date') date: string): Promise<DailyNutritionResponseDto> {
    return DailyTrackerResponseMapper.toResponseDto(await this.service.getByDate(user.sub, date));
  }

  @Post('entries')
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDailyNutritionEntryDto): Promise<DailyNutritionResponseDto> {
    return DailyTrackerResponseMapper.toResponseDto(await this.service.createEntry({
      userId: user.sub,
      date: dto.date ?? new Date().toISOString().slice(0, 10),
      foodId: dto.foodId,
      servingId: dto.servingId,
      recipeId: dto.recipeId,
      recipeVersionId: dto.recipeVersionId,
      servings: dto.servings,
    }));
  }

  @Patch('entries/:id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateDailyNutritionEntryDto): Promise<DailyNutritionResponseDto> {
    return DailyTrackerResponseMapper.toResponseDto(await this.service.updateEntry(user.sub, id, { servings: dto.servings }));
  }

  @Delete('entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    await this.service.deleteEntry(user.sub, id);
  }
}
