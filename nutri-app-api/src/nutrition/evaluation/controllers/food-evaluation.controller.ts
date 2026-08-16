import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { FoodEvaluationRequestDto } from '../dto/food-evaluation-request.dto.js';
import { FoodEvaluationResponseDto } from '../dto/food-evaluation-response.dto.js';
import { FoodEvaluationResponseMapper } from '../mappers/food-evaluation-response.mapper.js';
import { FoodEvaluationService } from '../services/food-evaluation.service.js';

@Controller('nutrition/food-evaluations')
@UseGuards(JwtAuthGuard)
export class FoodEvaluationController {
  constructor(private readonly service: FoodEvaluationService) {}

  @Post()
  async evaluate(
    @CurrentUser() user: JwtPayload,
    @Body() body: FoodEvaluationRequestDto,
  ): Promise<FoodEvaluationResponseDto> {
    const result = await this.service.evaluate(user.sub, body.foodId, body.servingId, body.quantity);
    return FoodEvaluationResponseMapper.toResponseDto(result);
  }
}
