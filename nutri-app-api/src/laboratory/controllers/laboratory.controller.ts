import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/jwt-payload.interface.js';
import { CreateLaboratoryReportDto } from '../dto/request/create-laboratory-report.dto.js';
import {
  LaboratoryLatestResponseDto,
  LaboratoryReportResponseDto,
  LaboratoryTrendDto,
} from '../dto/response/laboratory-analysis-response.dto.js';
import { LaboratoryAnalysisResponseMapper } from '../mappers/controller/laboratory-analysis-response.mapper.js';
import { LaboratoryReportService } from '../services/laboratory-report.service.js';

@Controller('laboratory')
@UseGuards(JwtAuthGuard)
export class LaboratoryController {
  constructor(private readonly service: LaboratoryReportService) {}

  @Get('reports')
  async reports(@CurrentUser() user: JwtPayload): Promise<LaboratoryReportResponseDto[]> {
    return (await this.service.findMany(user.sub)).map(LaboratoryAnalysisResponseMapper.report);
  }

  @Post('reports')
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLaboratoryReportDto): Promise<LaboratoryReportResponseDto> {
    return LaboratoryAnalysisResponseMapper.report(await this.service.create(user.sub, {
      reportDate: new Date(dto.reportDate),
      source: dto.source,
      results: dto.results,
    }));
  }

  @Get('reports/:id')
  async report(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<LaboratoryReportResponseDto> {
    return LaboratoryAnalysisResponseMapper.report(await this.service.findById(user.sub, id));
  }

  @Delete('reports/:id')
  @HttpCode(HttpStatus.CONFLICT)
  async delete(@CurrentUser() _user: JwtPayload, @Param('id') _id: string): Promise<never> {
    return this.service.delete();
  }

  @Get('trends')
  async trends(@CurrentUser() user: JwtPayload): Promise<LaboratoryTrendDto[]> {
    return LaboratoryAnalysisResponseMapper.trends(await this.service.trends(user.sub));
  }

  @Get('latest')
  async latest(@CurrentUser() user: JwtPayload): Promise<LaboratoryLatestResponseDto> {
    return LaboratoryAnalysisResponseMapper.latest(await this.service.latest(user.sub));
  }
}
