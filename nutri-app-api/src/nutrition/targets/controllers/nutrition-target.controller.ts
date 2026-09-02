import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { CreateNutritionTargetDto } from '../dto/request/create-nutrition-target.dto.js';
import { UpdateNutritionTargetDto } from '../dto/request/update-nutrition-target.dto.js';
import { NutritionTargetResponseDto } from '../dto/response/nutrition-target-response.dto.js';
import { NutritionTargetResponseMapper } from '../mappers/nutrition-target-response.mapper.js';
import { NutritionTargetService } from '../services/nutrition-target.service.js';

@Controller('nutrition-targets')
@UseGuards(JwtAuthGuard)
export class NutritionTargetController {
  constructor(private readonly service: NutritionTargetService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload): Promise<NutritionTargetResponseDto[]> {
    const targets = await this.service.list(user.sub);
    return targets.map(NutritionTargetResponseMapper.toDto);
  }

  @Get('current')
  async current(@CurrentUser() user: JwtPayload): Promise<NutritionTargetResponseDto[]> {
    const targets = await this.service.current(user.sub);
    return targets.map(NutritionTargetResponseMapper.toDto);
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateNutritionTargetDto): Promise<NutritionTargetResponseDto> {
    const target = await this.service.create(user.sub, {
      userId: user.sub,
      nutrient: dto.nutrient,
      value: dto.value,
      unit: dto.unit,
      kind: dto.kind,
      source: dto.source,
      approvalStatus: dto.approvalStatus ?? (dto.source === 'SYSTEM_SUGGESTED' || dto.source === 'IMPORTED' ? 'SUGGESTED' : 'APPROVED'),
      effectiveAt: new Date(dto.effectiveAt),
      expirationAt: dto.expirationAt == null ? null : new Date(dto.expirationAt),
      notes: dto.notes,
      rangeMin: dto.rangeMin,
      rangeMax: dto.rangeMax,
    });
    return NutritionTargetResponseMapper.toDto(target);
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNutritionTargetDto): Promise<NutritionTargetResponseDto> {
    const target = await this.service.update(user.sub, id, {
      value: dto.value,
      unit: dto.unit,
      kind: dto.kind,
      source: dto.source,
      approvalStatus: dto.approvalStatus,
      effectiveAt: dto.effectiveAt == null ? undefined : new Date(dto.effectiveAt),
      expirationAt: dto.expirationAt === undefined ? undefined : dto.expirationAt === null ? null : new Date(dto.expirationAt),
      notes: dto.notes,
      rangeMin: dto.rangeMin,
      rangeMax: dto.rangeMax,
    });
    return NutritionTargetResponseMapper.toDto(target);
  }
}
