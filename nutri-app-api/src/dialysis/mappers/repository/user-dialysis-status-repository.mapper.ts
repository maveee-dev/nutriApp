import { UserDialysisStatusRow } from '../../repositories/user-dialysis-status.prisma.js';
import { UserDialysisStatusSource } from '../../sources/user-dialysis-status.source.js';

export class UserDialysisStatusRepositoryMapper {
  static toSource(row: UserDialysisStatusRow): UserDialysisStatusSource {
    return {
      userId: row.userId,
      status: row.status,
      effectiveAt: row.effectiveAt,
      reportedAt: row.reportedAt,
      updatedAt: row.updatedAt,
    };
  }
}
