import { DiabetesTargetApprovalSource } from '../../../../generated/prisma/client.js';

export interface DiabetesCarbohydrateTargetSource {
  readonly userId: string;
  readonly targetGrams: string;
  readonly approvalSource: DiabetesTargetApprovalSource;
  readonly sourceReference: string | null;
  readonly approvedAt: Date;
  readonly expiresAt: Date | null;
}
