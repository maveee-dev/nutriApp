import { DialysisModality, DialysisStatus } from '../../../generated/prisma/client.js';

export interface UserDialysisStatusSource {
  readonly userId: string;
  readonly status: DialysisStatus;
  readonly modality: DialysisModality;
  readonly effectiveAt: Date | null;
  readonly reportedAt: Date;
  readonly updatedAt: Date;
}
