import { DialysisStatus } from '../../../../generated/prisma/client.js';

export class UserDialysisStatusResponseDto {
  status!: DialysisStatus;
  effectiveAt!: Date | null;
  reportedAt!: Date;
  updatedAt!: Date;
}
