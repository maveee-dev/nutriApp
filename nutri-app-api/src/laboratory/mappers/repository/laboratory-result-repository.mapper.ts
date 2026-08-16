import { LaboratoryResultRow } from '../../repositories/laboratory-result.prisma.js';
import { LaboratoryResultSource } from '../../sources/laboratory-result.source.js';

export class LaboratoryResultRepositoryMapper {
  static toSource(row: LaboratoryResultRow): LaboratoryResultSource {
    return {
      id: row.id,
      userId: row.userId,
      testCode: row.testCode,
      value: row.value.toString(),
      unit: row.unit,
      referenceLow: row.referenceLow?.toString() ?? null,
      referenceHigh: row.referenceHigh?.toString() ?? null,
      collectedAt: row.collectedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
