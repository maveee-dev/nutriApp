import { Controller, Get, HttpCode, Param, Post, Query, UseGuards, HttpStatus, Delete, Body } from '@nestjs/common';
import { MealsService } from '../services/meals.service.js';
import { CreateMealDto } from '../dto/request/create-meal.dto.js';
import{ MealSummaryResponseDto } from '../dto/response/meal-summary-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import type { JwtPayload } from '../../common/types/jwt-payload.interface.js';
import { MealResponseMapper } from '../mappers/controller/meal-response.mapper.js';
import { MealDetailResponseDto } from '../dto/response/meal-detail-response.dto.js';
import { FindMealsDto } from '../dto/request/find-meals.dto.js';
import { MealRequestMapper } from '../mappers/controller/meal-request.mapper.js';
import { OffsetPaginatedResponseMapper } from '../../common/pagination/offset/mappers/paginated-response.mapper.js';
import { OffsetPaginatedResponseDto } from '../../common/pagination/offset/dto/offset-paginated-response.dto.js';
import { UuidParamDto } from '../../common/dto/request/uuid-param.dto.js';

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(
    private readonly mealsService: MealsService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMealDto,
  ): Promise<MealDetailResponseDto> {
    const input = MealRequestMapper.toCreateMealInput(
      user.sub,
      dto,
    );

    const meal = await this.mealsService.create(input);

    return MealResponseMapper.toMealDetailResponseDto(meal);
  }

  @Get()
  async findMany(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindMealsDto,    
  ): Promise<OffsetPaginatedResponseDto<MealSummaryResponseDto>> {
    const input = MealRequestMapper.toFindMealsInput(
      user.sub,
      query,
    );

    const meals = await this.mealsService.findMany(input);

    return OffsetPaginatedResponseMapper.toResponse(
      meals,
      MealResponseMapper.toMealSummaryResponseDto,
    );
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param() param: UuidParamDto,
  ): Promise<MealDetailResponseDto> {
    const meal = await this.mealsService.findDetailById(param.id, user.sub);

    return MealResponseMapper.toMealDetailResponseDto(meal);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param() param: UuidParamDto,
  ): Promise<void> {
    await this.mealsService.delete(param.id, user.sub);
  }

}
