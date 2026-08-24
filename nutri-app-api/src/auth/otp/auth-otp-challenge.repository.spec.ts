import { jest } from '@jest/globals';
import { AuthOtpPurpose } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthOtpChallengeRepository } from './auth-otp-challenge.repository.js';

describe('AuthOtpChallengeRepository', () => {
  it('increments attempts only while the challenge is available', async () => {
    const updateMany = jest.fn(async () => ({ count: 1 }));
    const prisma = { authOtpChallenge: { updateMany } };
    const repository = new AuthOtpChallengeRepository(prisma as unknown as PrismaService);

    await repository.incrementAttemptsIfAvailable('challenge-1', 5);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'challenge-1',
        consumedAt: null,
        attemptCount: { lt: 5 },
      },
      data: { attemptCount: { increment: 1 } },
    });
  });

  it('atomically consumes a challenge, verifies the user, and invalidates other challenges', async () => {
    const consumeChallenge = jest.fn(async () => ({ count: 1 }));
    const verifyUser = jest.fn(async () => ({ count: 1 }));
    const invalidateChallenges = jest.fn(async () => ({ count: 2 }));
    const transaction = {
      authOtpChallenge: {
        updateMany: jest
          .fn()
          .mockImplementationOnce(consumeChallenge)
          .mockImplementationOnce(invalidateChallenges),
      },
      user: { updateMany: verifyUser },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (value: typeof transaction) => Promise<boolean>) => callback(transaction)),
    };
    const repository = new AuthOtpChallengeRepository(prisma as unknown as PrismaService);

    await expect(repository.consumeAndVerifyUser('user-1', 'challenge-1'))
      .resolves.toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(consumeChallenge).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'challenge-1',
        userId: 'user-1',
        purpose: AuthOtpPurpose.EMAIL_VERIFICATION,
        consumedAt: null,
      },
    }));
    expect(verifyUser).toHaveBeenCalledWith({
      where: { id: 'user-1', emailVerifiedAt: null },
      data: { emailVerifiedAt: expect.any(Date) },
    });
    expect(invalidateChallenges).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 'user-1',
        purpose: AuthOtpPurpose.EMAIL_VERIFICATION,
        consumedAt: null,
      },
    }));
  });

  it('does not verify the user when the challenge was consumed concurrently', async () => {
    const consumeChallenge = jest.fn(async () => ({ count: 0 }));
    const verifyUser = jest.fn();
    const transaction = {
      authOtpChallenge: { updateMany: consumeChallenge },
      user: { updateMany: verifyUser },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (value: typeof transaction) => Promise<boolean>) => callback(transaction)),
    };
    const repository = new AuthOtpChallengeRepository(prisma as unknown as PrismaService);

    await expect(repository.consumeAndVerifyUser('user-1', 'challenge-1'))
      .resolves.toBe(false);
    expect(verifyUser).not.toHaveBeenCalled();
  });
});

