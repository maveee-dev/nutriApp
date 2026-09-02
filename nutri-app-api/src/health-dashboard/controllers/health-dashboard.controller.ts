import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/jwt-payload.interface.js';
import { HealthDashboardResponseDto } from '../dto/health-dashboard-response.dto.js';
import { HealthDashboardResponseMapper } from '../mappers/health-dashboard-response.mapper.js';
import { HealthDashboardService } from '../services/health-dashboard.service.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class HealthDashboardController {
  constructor(private readonly service: HealthDashboardService) {}

  @Get('today')
  async today(@CurrentUser() user: JwtPayload): Promise<HealthDashboardResponseDto> {
    return HealthDashboardResponseMapper.toDto(await this.service.today(user.sub, user.email));
  }
}
