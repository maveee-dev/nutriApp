import { DialysisModality, DialysisStatus } from '../../../../generated/prisma/client.js';

export class UserDialysisStatusResponseDto {
  status!: DialysisStatus;
  modality!: DialysisModality;
  frequency!: string | null;
  schedule!: string | null;
  effectiveAt!: Date | null;
  reportedAt!: Date;
  updatedAt!: Date;
}
