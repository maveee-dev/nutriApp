import { Injectable } from '@nestjs/common';
import { AuthOtpPurpose } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface CreateAuthOtpChallengeInput {
  readonly userId: string;
  readonly purpose: AuthOtpPurpose;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly sentAt: Date;
  readonly cooldownUntil: Date;
  readonly maxAttempts: number;
}

/** Persistence boundary for OTP challenges; no endpoint uses it in Phase 1. */
@Injectable()
export class AuthOtpChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateAuthOtpChallengeInput) {
    return this.prisma.authOtpChallenge.create({ data: input });
  }

  findLatestActive(userId: string, purpose: AuthOtpPurpose, asOf = new Date()) {
    return this.prisma.authOtpChallenge.findFirst({
      where: { userId, purpose, consumedAt: null, expiresAt: { gt: asOf } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  incrementAttempts(id: string) {
    return this.prisma.authOtpChallenge.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    });
  }

  incrementAttemptsIfAvailable(id: string, maxAttempts: number) {
    return this.prisma.authOtpChallenge.updateMany({
      where: {
        id,
        consumedAt: null,
        attemptCount: { lt: maxAttempts },
      },
      data: { attemptCount: { increment: 1 } },
    });
  }

  consume(id: string, consumedAt = new Date()) {
    return this.prisma.authOtpChallenge.update({
      where: { id },
      data: { consumedAt },
    });
  }

  invalidateActive(userId: string, purpose: AuthOtpPurpose, consumedAt = new Date()) {
    return this.prisma.authOtpChallenge.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt },
    });
  }

  /**
   * Atomically consumes the verified challenge, marks the user verified, and
   * invalidates any other active verification challenges.
   */
  async consumeAndVerifyUser(userId: string, challengeId: string, consumedAt = new Date()): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.authOtpChallenge.updateMany({
        where: {
          id: challengeId,
          userId,
          purpose: AuthOtpPurpose.EMAIL_VERIFICATION,
          consumedAt: null,
        },
        data: { consumedAt },
      });

      if (consumed.count !== 1) {
        return false;
      }

      await transaction.user.updateMany({
        where: { id: userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: consumedAt },
      });

      await transaction.authOtpChallenge.updateMany({
        where: {
          userId,
          purpose: AuthOtpPurpose.EMAIL_VERIFICATION,
          consumedAt: null,
        },
        data: { consumedAt },
      });

      return true;
    });
  }
}
