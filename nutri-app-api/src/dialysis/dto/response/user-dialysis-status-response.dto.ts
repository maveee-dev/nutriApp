import { DialysisModality, DialysisStatus } from '../../../../generated/prisma/client.js';

export class UserDialysisStatusResponseDto {
  status!: DialysisStatus;
  modality!: DialysisModality;
  effectiveAt!: Date | null;
  reportedAt!: Date;
  updatedAt!: Date;
}
