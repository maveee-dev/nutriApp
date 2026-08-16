import { DialysisStatus } from '../../../generated/prisma/client.js';

export interface UserDialysisStatusSource {
  readonly userId: string;
  readonly status: DialysisStatus;
  readonly effectiveAt: Date | null;
  readonly reportedAt: Date;
  readonly updatedAt: Date;
}
