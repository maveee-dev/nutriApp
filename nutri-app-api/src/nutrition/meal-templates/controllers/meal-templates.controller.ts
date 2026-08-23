import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { MealTemplateResponseDto } from '../dto/response/meal-template-response.dto.js';
import { MealTemplateResponseMapper } from '../mappers/controller/meal-template-response.mapper.js';
import { MealTemplatesService } from '../services/meal-templates.service.js';

@Controller('nutrition/meal-templates')
@UseGuards(JwtAuthGuard)
export class MealTemplatesController {
  constructor(private readonly service: MealTemplatesService) {}

  @Get()
  async findMany(@CurrentUser() user: JwtPayload): Promise<MealTemplateResponseDto[]> {
    const templates = await this.service.findMany(user.sub);
    return templates.map(MealTemplateResponseMapper.toDto);
  }

  @Get(':id')
  async findById(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<MealTemplateResponseDto> {
    return MealTemplateResponseMapper.toDto(await this.service.findById(user.sub, id));
  }
}
