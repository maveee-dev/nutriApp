import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../../common/types/jwt-payload.interface.js';
import { PersonalizedRecommendationQueryDto } from '../dto/personalized-recommendation-query.dto.js';
import { PersonalizedRecommendationResponseDto } from '../dto/personalized-recommendation-response.dto.js';
import { PersonalizedRecommendationResponseMapper } from '../mappers/personalized-recommendation-response.mapper.js';
import { PersonalizedRecommendationService } from '../services/personalized-recommendation.service.js';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class PersonalizedRecommendationController {
  constructor(private readonly service: PersonalizedRecommendationService) {}

  @Get()
  async recommendations(@CurrentUser() user: JwtPayload, @Query() query: PersonalizedRecommendationQueryDto): Promise<PersonalizedRecommendationResponseDto> {
    return PersonalizedRecommendationResponseMapper.toDto(await this.service.recommend(user.sub, query));
  }
}
