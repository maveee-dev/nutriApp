import { Injectable } from '@nestjs/common';
import { AuthOtpPurpose } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface CompletePasswordResetInput {
  readonly userId: string;
  readonly challengeId: string;
  readonly passwordHash: string;
  readonly resetAt?: Date;
}

/**
 * Atomic persistence boundary for password reset completion. The OTP is
 * consumed, the password is replaced, all refresh sessions are revoked, and
 * remaining reset challenges are invalidated in one transaction.
 */
@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async complete(input: CompletePasswordResetInput): Promise<boolean> {
    const resetAt = input.resetAt ?? new Date();

    return this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.authOtpChallenge.updateMany({
        where: {
          id: input.challengeId,
          userId: input.userId,
          purpose: AuthOtpPurpose.PASSWORD_RESET,
          consumedAt: null,
        },
        data: { consumedAt: resetAt },
      });

      if (consumed.count !== 1) {
        return false;
      }

      const updatedUser = await transaction.user.updateMany({
        where: { id: input.userId },
        data: { password: input.passwordHash },
      });

      if (updatedUser.count !== 1) {
        return false;
      }

      await transaction.refreshTokenSession.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: { revokedAt: resetAt },
      });

      await transaction.authOtpChallenge.updateMany({
        where: {
          userId: input.userId,
          purpose: AuthOtpPurpose.PASSWORD_RESET,
          consumedAt: null,
        },
        data: { consumedAt: resetAt },
      });

      return true;
    });
  }
}
