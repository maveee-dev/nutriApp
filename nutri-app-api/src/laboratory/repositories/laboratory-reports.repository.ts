import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LaboratoryReportRepositoryMapper } from '../mappers/repository/laboratory-report-repository.mapper.js';
import { LaboratoryReportSource } from '../sources/laboratory-report.source.js';
import { CreateLaboratoryReportInput } from '../types/create-laboratory-report.input.js';
import { LABORATORY_TEST_DEFINITIONS, LaboratoryTestCode } from '../types/laboratory-test-code.js';
import { LaboratoryReportWithResultsRow } from './laboratory-report.prisma.js';

@Injectable()
export class LaboratoryReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateLaboratoryReportInput): Promise<LaboratoryReportSource> {
    const supportedResults = input.results
      .map((result) => ({ ...result, testCode: result.testCode.trim().toLowerCase() }))
      .filter((result) => this.isSupported(result.testCode));

    const row = await this.prisma.laboratoryReport.create({
      data: {
        userId,
        reportDate: input.reportDate,
        source: input.source?.trim() || 'manual',
        results: {
          create: supportedResults.map((result) => ({
            userId,
            testCode: result.testCode,
            testName: result.testName?.trim() || this.definition(result.testCode).label,
            value: result.value,
            unit: result.unit.trim(),
            referenceLow: result.referenceLow ?? null,
            referenceHigh: result.referenceHigh ?? null,
            flag: result.flag?.trim() || null,
            collectedAt: input.reportDate,
          })),
        },
      },
      include: { results: true },
    });
    return LaboratoryReportRepositoryMapper.toSource(row as LaboratoryReportWithResultsRow);
  }

  async findMany(userId: string): Promise<LaboratoryReportSource[]> {
    const [reports, legacyResults] = await Promise.all([
      this.prisma.laboratoryReport.findMany({
        where: { userId },
        include: { results: true },
        orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.laboratoryResult.findMany({
        where: { userId, reportId: null },
        orderBy: [{ collectedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return [...reports.map((report) => LaboratoryReportRepositoryMapper.toSource(report)), ...legacyResults.map((result) => LaboratoryReportRepositoryMapper.toLegacySource(result))]
      .sort((left, right) => this.compareReports(left, right));
  }

  async findById(userId: string, id: string): Promise<LaboratoryReportSource | null> {
    const report = await this.prisma.laboratoryReport.findFirst({
      where: { id, userId },
      include: { results: true },
    });
    if (report != null) return LaboratoryReportRepositoryMapper.toSource(report);

    const legacyResult = await this.prisma.laboratoryResult.findFirst({ where: { id, userId, reportId: null } });
    return legacyResult == null ? null : LaboratoryReportRepositoryMapper.toLegacySource(legacyResult);
  }

  private isSupported(testCode: string): testCode is LaboratoryTestCode {
    return Object.prototype.hasOwnProperty.call(LABORATORY_TEST_DEFINITIONS, testCode);
  }

  private definition(testCode: string): (typeof LABORATORY_TEST_DEFINITIONS)[LaboratoryTestCode] {
    return LABORATORY_TEST_DEFINITIONS[testCode as LaboratoryTestCode];
  }

  private compareReports(left: LaboratoryReportSource, right: LaboratoryReportSource): number {
    const dateDifference = right.reportDate.getTime() - left.reportDate.getTime();
    if (dateDifference !== 0) return dateDifference;
    const createdDifference = right.createdAt.getTime() - left.createdAt.getTime();
    if (createdDifference !== 0) return createdDifference;
    return right.id.localeCompare(left.id);
  }
}
