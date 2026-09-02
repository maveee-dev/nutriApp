import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LaboratoryAnalysisService } from './laboratory-analysis.service.js';
import { LaboratoryReportsRepository } from '../repositories/laboratory-reports.repository.js';
import { LaboratoryReportAnalysisSource, LaboratoryLatestSource, LaboratoryTrendSource } from '../sources/laboratory-analysis.source.js';
import { CreateLaboratoryReportInput } from '../types/create-laboratory-report.input.js';
import { LABORATORY_TEST_DEFINITIONS } from '../types/laboratory-test-code.js';

@Injectable()
export class LaboratoryReportService {
  constructor(
    private readonly repository: LaboratoryReportsRepository,
    private readonly analysis: LaboratoryAnalysisService,
  ) {}

  async create(userId: string, input: CreateLaboratoryReportInput): Promise<LaboratoryReportAnalysisSource> {
    this.validateReportDate(input.reportDate);
    const normalizedCodes = input.results.map((result) => result.testCode.trim().toLowerCase());
    const ignoredTestCodes = normalizedCodes.filter((code) => !this.isSupported(code));
    const report = await this.repository.create(userId, input);
    return this.analysis.analyzeReport(report, ignoredTestCodes);
  }

  async findMany(userId: string): Promise<LaboratoryReportAnalysisSource[]> {
    return this.analysis.analyzeReports(await this.repository.findMany(userId));
  }

  async findById(userId: string, id: string): Promise<LaboratoryReportAnalysisSource> {
    const report = await this.repository.findById(userId, id);
    if (report == null) throw new NotFoundException('Laboratory report not found.');
    return this.analysis.analyzeReport(report);
  }

  async latest(userId: string): Promise<LaboratoryLatestSource> {
    return this.analysis.latest(await this.repository.findMany(userId));
  }

  async trends(userId: string): Promise<LaboratoryTrendSource[]> {
    return this.analysis.trends(await this.repository.findMany(userId));
  }

  /**
   * Reports are append-only. The route is kept explicit so clients receive a
   * clear response instead of accidentally treating immutable history as an
   * editable resource.
   */
  async delete(): Promise<never> {
    throw new ConflictException('Historical laboratory reports are immutable and cannot be deleted.');
  }

  private validateReportDate(reportDate: Date): void {
    if (!(reportDate instanceof Date) || Number.isNaN(reportDate.getTime())) {
      throw new BadRequestException('reportDate must be a valid date.');
    }
  }

  private isSupported(testCode: string): boolean {
    return Object.prototype.hasOwnProperty.call(LABORATORY_TEST_DEFINITIONS, testCode);
  }
}
