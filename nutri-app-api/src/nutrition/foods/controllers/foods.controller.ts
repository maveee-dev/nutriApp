import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { OffsetPaginatedResponseDto } from '../../../common/pagination/offset/dto/offset-paginated-response.dto.js';
import { OffsetPaginatedResponseMapper } from '../../../common/pagination/offset/mappers/paginated-response.mapper.js';
import { FoodsQueryDto } from '../dto/request/foods-query.dto.js';
import { FoodDetailResponseDto } from '../dto/response/food-detail-response.dto.js';
import { FoodSummaryResponseDto } from '../dto/response/food-summary-response.dto.js';
import { FoodResponseMapper } from '../mappers/controller/food-response.mapper.js';
import { FoodsService } from '../services/foods.service.js';

@Controller('foods')
@UseGuards(JwtAuthGuard)
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Get()
  async findMany(
    @Query() query: FoodsQueryDto,
  ): Promise<OffsetPaginatedResponseDto<FoodSummaryResponseDto>> {
    const foods = await this.foodsService.findMany(query);

    return OffsetPaginatedResponseMapper.toResponse(
      foods,
      FoodResponseMapper.toFoodSummaryDto,
    );
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FoodDetailResponseDto> {
    const food = await this.foodsService.findDetailById(id);

    return FoodResponseMapper.toFoodDetailDto(food);
  }
}
