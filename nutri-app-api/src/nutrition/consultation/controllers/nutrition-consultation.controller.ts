import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { ConsultationRequestDto } from '../dto/consultation-request.dto.js';
import { NutritionConsultationResponseDto } from '../dto/consultation-response.dto.js';
import { AiNutritionConsultationService } from '../services/ai-nutrition-consultation.service.js';

@Controller('nutrition/consultation')
@UseGuards(JwtAuthGuard)
export class NutritionConsultationController {
  constructor(private readonly service: AiNutritionConsultationService) {}

  @Post()
  consult(@CurrentUser() user: JwtPayload, @Body() request: ConsultationRequestDto): Promise<NutritionConsultationResponseDto> {
    return this.service.consult(user.sub, request.question, request.date, request.conversation ?? []);
  }
}
