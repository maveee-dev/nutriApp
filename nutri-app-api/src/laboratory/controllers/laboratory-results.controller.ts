import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/jwt-payload.interface.js';
import { CreateLaboratoryResultDto } from '../dto/request/create-laboratory-result.dto.js';
import { FindLaboratoryResultsDto } from '../dto/request/find-laboratory-results.dto.js';
import { LaboratoryResultResponseDto } from '../dto/response/laboratory-result-response.dto.js';
import { LaboratoryResultResponseMapper } from '../mappers/controller/laboratory-result-response.mapper.js';
import { LaboratoryResultsService } from '../services/laboratory-results.service.js';

@Controller('laboratory/results')
@UseGuards(JwtAuthGuard)
export class LaboratoryResultsController {
  constructor(private readonly service: LaboratoryResultsService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLaboratoryResultDto,
  ): Promise<LaboratoryResultResponseDto> {
    const result = await this.service.create(user.sub, {
      ...dto,
      collectedAt: new Date(dto.collectedAt),
    });
    return LaboratoryResultResponseMapper.toResponseDto(result);
  }

  @Get()
  async findMany(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindLaboratoryResultsDto,
  ): Promise<LaboratoryResultResponseDto[]> {
    const results = await this.service.findMany(user.sub, query);
    return results.map(LaboratoryResultResponseMapper.toResponseDto);
  }
}
