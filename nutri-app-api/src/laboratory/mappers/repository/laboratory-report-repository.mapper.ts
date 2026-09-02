import { LaboratoryResultRow } from '../../repositories/laboratory-result.prisma.js';
import { LaboratoryReportWithResultsRow } from '../../repositories/laboratory-report.prisma.js';
import { LaboratoryReportResultSource, LaboratoryReportSource } from '../../sources/laboratory-report.source.js';

export class LaboratoryReportRepositoryMapper {
  static toSource(row: LaboratoryReportWithResultsRow): LaboratoryReportSource {
    return {
      id: row.id,
      userId: row.userId,
      reportDate: row.reportDate,
      source: row.source,
      createdAt: row.createdAt,
      results: row.results.map((result) => this.toResultSource(result)),
    };
  }

  static toLegacySource(row: LaboratoryResultRow): LaboratoryReportSource {
    return {
      id: row.id,
      userId: row.userId,
      reportDate: row.collectedAt,
      source: 'legacy-result',
      createdAt: row.createdAt,
      results: [this.toResultSource(row)],
    };
  }

  private static toResultSource(row: LaboratoryResultRow): LaboratoryReportResultSource {
    return {
      id: row.id,
      reportId: row.reportId,
      userId: row.userId,
      testCode: row.testCode,
      testName: row.testName,
      value: row.value.toString(),
      unit: row.unit,
      referenceLow: row.referenceLow?.toString() ?? null,
      referenceHigh: row.referenceHigh?.toString() ?? null,
      flag: row.flag,
      collectedAt: row.collectedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
