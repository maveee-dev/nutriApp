import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/jwt-payload.interface.js';
import { UpdateDialysisStatusDto } from '../dto/request/update-dialysis-status.dto.js';
import { UserDialysisStatusResponseDto } from '../dto/response/user-dialysis-status-response.dto.js';
import { UserDialysisStatusResponseMapper } from '../mappers/controller/user-dialysis-status-response.mapper.js';
import { UserDialysisStatusService } from '../services/user-dialysis-status.service.js';

@Controller('dialysis-status')
@UseGuards(JwtAuthGuard)
export class UserDialysisStatusController {
  constructor(private readonly service: UserDialysisStatusService) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload): Promise<UserDialysisStatusResponseDto | null> {
    const status = await this.service.get(user.sub);
    return status ? UserDialysisStatusResponseMapper.toResponseDto(status) : null;
  }

  @Put()
  async update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDialysisStatusDto,
  ): Promise<UserDialysisStatusResponseDto> {
    const status = await this.service.update(user.sub, {
      status: dto.status,
      effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : undefined,
    });
    return UserDialysisStatusResponseMapper.toResponseDto(status);
  }
}
