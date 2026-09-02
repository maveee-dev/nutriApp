import { UserDialysisStatusRow } from '../../repositories/user-dialysis-status.prisma.js';
import { UserDialysisStatusSource } from '../../sources/user-dialysis-status.source.js';

export class UserDialysisStatusRepositoryMapper {
  static toSource(row: UserDialysisStatusRow): UserDialysisStatusSource {
    return {
      userId: row.userId,
      status: row.status,
      modality: row.modality,
      frequency: row.frequency,
      schedule: row.schedule,
      effectiveAt: row.effectiveAt,
      reportedAt: row.reportedAt,
      updatedAt: row.updatedAt,
    };
  }
}
