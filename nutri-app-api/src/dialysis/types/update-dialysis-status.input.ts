import { DialysisStatus } from '../../../generated/prisma/client.js';

export interface UpdateDialysisStatusInput {
  readonly status: DialysisStatus;
  readonly effectiveAt?: Date;
}
