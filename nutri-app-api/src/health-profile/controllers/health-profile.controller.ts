import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/jwt-payload.interface.js';
import { HealthProfileResponseDto } from '../dto/response/health-profile-response.dto.js';
import { UpdateHealthProfileDto } from '../dto/request/update-health-profile.dto.js';
import { HealthProfileResponseMapper } from '../mappers/health-profile-response.mapper.js';
import { HealthProfileService } from '../services/health-profile.service.js';

@Controller('health-profile')
@UseGuards(JwtAuthGuard)
export class HealthProfileController {
  constructor(private readonly service: HealthProfileService) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload): Promise<HealthProfileResponseDto> {
    return HealthProfileResponseMapper.toDto(await this.service.get(user.sub));
  }

  @Patch()
  async update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateHealthProfileDto): Promise<HealthProfileResponseDto> {
    return HealthProfileResponseMapper.toDto(await this.service.update(user.sub, {
      personal: dto.personal,
      dialysis: dto.dialysis == null ? undefined : {
        status: dto.dialysis.status,
        modality: dto.dialysis.modality,
        effectiveAt: dto.dialysis.effectiveAt === undefined ? undefined : dto.dialysis.effectiveAt === null ? null : new Date(dto.dialysis.effectiveAt),
        ...(dto.dialysis.frequency === undefined ? {} : { frequency: dto.dialysis.frequency }),
        ...(dto.dialysis.schedule === undefined ? {} : { schedule: dto.dialysis.schedule }),
      },
      conditionIds: dto.conditionIds,
      allergies: dto.allergies,
      medications: dto.medications,
    }));
  }
}
