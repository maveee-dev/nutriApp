import { DialysisModality, DialysisStatus } from '../../../generated/prisma/client.js';

export interface UpdateDialysisStatusInput {
  readonly status: DialysisStatus;
  readonly modality?: DialysisModality;
  readonly effectiveAt?: Date | null;
  readonly frequency?: string | null;
  readonly schedule?: string | null;
}
