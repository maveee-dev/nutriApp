import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/jwt-payload.interface.js';
import { OffsetPaginatedResponseDto } from '../../common/pagination/offset/dto/offset-paginated-response.dto.js';
import { OffsetPaginatedResponseMapper } from '../../common/pagination/offset/mappers/paginated-response.mapper.js';
import { FindConditionsDto } from '../dto/request/find-conditions.dto.js';
import { ConditionResponseDto } from '../dto/response/condition-response.dto.js';
import { UserConditionResponseDto } from '../dto/response/user-condition-response.dto.js';
import { ConditionResponseMapper } from '../mappers/controller/condition-response.mapper.js';
import { UserConditionResponseMapper } from '../mappers/controller/user-condition-response.mapper.js';
import { ConditionsService } from '../services/conditions.service.js';

@Controller('conditions')
@UseGuards(JwtAuthGuard)
export class ConditionsController {
  constructor(private readonly conditionsService: ConditionsService) {}

  @Get()
  async listConditions(@Query() query: FindConditionsDto): Promise<OffsetPaginatedResponseDto<ConditionResponseDto>> {
    const result = await this.conditionsService.listConditions(query);
    return OffsetPaginatedResponseMapper.toResponse(result, ConditionResponseMapper.toConditionResponseDto);
  }

  @Get('me')
  async getMyConditions(@CurrentUser() user: JwtPayload, @Query() query: FindConditionsDto): Promise<OffsetPaginatedResponseDto<UserConditionResponseDto>> {
    const result = await this.conditionsService.getMyConditions(user.sub, query);
    return OffsetPaginatedResponseMapper.toResponse(result, UserConditionResponseMapper.toUserConditionResponseDto);
  }

  @Post('me/:conditionId')
  async addMyCondition(@CurrentUser() user: JwtPayload, @Param('conditionId', ParseUUIDPipe) conditionId: string): Promise<UserConditionResponseDto> {
    const condition = await this.conditionsService.addMyCondition(user.sub, conditionId);
    return UserConditionResponseMapper.toUserConditionResponseDto(condition);
  }

  @Delete('me/:conditionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMyCondition(@CurrentUser() user: JwtPayload, @Param('conditionId', ParseUUIDPipe) conditionId: string): Promise<void> {
    await this.conditionsService.removeMyCondition(user.sub, conditionId);
  }
}
